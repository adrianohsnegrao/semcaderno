import { randomUUID } from 'node:crypto';

import fastifyCookie, { type FastifyCookieOptions, type ParseOptions } from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { createInspectCurrentSession, type SessionResolutionPort } from '@sem-caderno/application';
import type { ProblemDetails } from '@sem-caderno/contracts';
import Fastify from 'fastify';

import { extractSessionCookieEvidence } from './session-cookie-evidence.js';
import type { SessionHttpConfiguration } from './session-http-configuration.js';
import { createCurrentSessionInspectionComposition } from './session-inspection-composition.js';
import type { MvpStore } from '@sem-caderno/application';
import { registerMvpRoutes } from './mvp-routes.js';

export type BuildAppDependencies = Readonly<{
  sessionConfiguration: SessionHttpConfiguration;
  sessionResolution: SessionResolutionPort;
  mvpStore?: MvpStore;
  webOrigin?: string;
  secureCookies?: boolean;
  logger?: boolean;
}>;

const internalFailure = (correlationId: string): ProblemDetails => ({
  type: 'about:blank',
  title: 'Internal failure',
  status: 500,
  code: 'INTERNAL_FAILURE',
  detail: 'The request could not be completed.',
  correlationId,
  retry: 'afterDelay',
  commitState: 'notApplicable',
  freshStateRequired: false,
});

export const buildApp = (dependencies: BuildAppDependencies) => {
  const inspectCurrentSession = createCurrentSessionInspectionComposition({
    hmacKey: dependencies.sessionConfiguration.hmacKey,
    inspectCurrentSession: createInspectCurrentSession(dependencies.sessionResolution),
  });
  const app = Fastify({
    logger: dependencies.logger ?? false,
    genReqId: () => randomUUID(),
    bodyLimit: 64 * 1024,
    requestTimeout: 15_000,
    connectionTimeout: 10_000,
    routerOptions: { maxParamLength: 200 },
  });
  const cookiePluginOptions: FastifyCookieOptions & { parseOptions: ParseOptions } = {
    parseOptions: { decode: (value: string) => value },
  };

  app.register(fastifyCookie, cookiePluginOptions);
  app.addHook('onSend', (request, reply, _payload, done) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Frame-Options', 'DENY')
      .header('Referrer-Policy', 'no-referrer')
      .header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (request.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    done();
  });
  if (dependencies.mvpStore) {
    app.register(fastifyCors, {
      origin: dependencies.webOrigin ?? 'http://127.0.0.1:3000',
      credentials: true,
      allowedHeaders: ['content-type', 'idempotency-key', 'x-sem-caderno-csrf'],
    });
    app.register((instance, _options, done) => {
      registerMvpRoutes(instance, dependencies.mvpStore!, {
        secureCookies: dependencies.secureCookies ?? false,
      });
      done();
    });
  }

  app.get(
    '/api/v1/session',
    {
      errorHandler: (_error, request, reply) => {
        reply
          .code(500)
          .header('Cache-Control', 'no-store')
          .type('application/problem+json')
          .send(internalFailure(request.id));
      },
    },
    async (request, reply) => {
      const sessionEvidence = extractSessionCookieEvidence(
        request.headers.cookie,
        request.cookies,
        dependencies.sessionConfiguration.cookieName,
      );
      const result = await inspectCurrentSession.execute({
        ...(sessionEvidence === undefined ? {} : { sessionEvidence }),
        evaluatedAt: new Date(),
      });

      return reply
        .code(200)
        .header('Cache-Control', 'no-store')
        .type('application/json')
        .send(result);
    },
  );

  return app;
};
