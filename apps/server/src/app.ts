import { randomUUID } from 'node:crypto';

import fastifyCookie, { type FastifyCookieOptions, type ParseOptions } from '@fastify/cookie';
import { createInspectCurrentSession, type SessionResolutionPort } from '@sem-caderno/application';
import type { ProblemDetails } from '@sem-caderno/contracts';
import Fastify from 'fastify';

import { extractSessionCookieEvidence } from './session-cookie-evidence.js';
import type { SessionHttpConfiguration } from './session-http-configuration.js';
import { createCurrentSessionInspectionComposition } from './session-inspection-composition.js';

export type BuildAppDependencies = Readonly<{
  sessionConfiguration: SessionHttpConfiguration;
  sessionResolution: SessionResolutionPort;
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
  const app = Fastify({ logger: false, genReqId: () => randomUUID() });
  const cookiePluginOptions: FastifyCookieOptions & { parseOptions: ParseOptions } = {
    parseOptions: { decode: (value: string) => value },
  };

  app.register(fastifyCookie, cookiePluginOptions);

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
