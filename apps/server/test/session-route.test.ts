import type {
  AuthenticatedSessionInspection,
  ResolveSessionInput,
  SessionResolutionPort,
} from '@sem-caderno/application';
import {
  currentSessionInspectionResponseSchema,
  problemDetailsSchema,
} from '@sem-caderno/contracts';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { loadSessionHttpConfiguration } from '../src/session-http-configuration.js';

const cookieName = 'sem-caderno-session';
const evidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const encodedKey = Buffer.from(Uint8Array.from({ length: 32 }, (_, index) => index)).toString(
  'base64url',
);
const configuration = loadSessionHttpConfiguration({
  SEM_CADERNO_SESSION_COOKIE_PROFILE: 'local-development',
  SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL: encodedKey,
});

class RecordingSessionResolution implements SessionResolutionPort {
  readonly calls: ResolveSessionInput[] = [];

  constructor(
    private readonly result: AuthenticatedSessionInspection | undefined,
    private readonly failure?: Error,
  ) {}

  resolve(input: ResolveSessionInput): Promise<AuthenticatedSessionInspection | undefined> {
    this.calls.push(input);
    return this.failure === undefined ? Promise.resolve(this.result) : Promise.reject(this.failure);
  }
}

const apps: FastifyInstance[] = [];
const appWith = (sessionResolution: SessionResolutionPort): FastifyInstance => {
  const app = buildApp({ sessionConfiguration: configuration, sessionResolution });
  apps.push(app);
  return app;
};

describe('GET /api/v1/session', () => {
  afterEach(async () => {
    vi.useRealTimers();
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns anonymous without resolution for missing evidence', async () => {
    const resolver = new RecordingSessionResolution(undefined);
    const response = await appWith(resolver).inject({ method: 'GET', url: '/api/v1/session' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers).not.toHaveProperty('etag');
    expect(response.headers).not.toHaveProperty('set-cookie');
    expect(response.json()).toEqual({ data: { state: 'anonymous' } });
    expect(resolver.calls).toEqual([]);
  });

  it.each([
    { label: 'malformed', value: 'v1.invalid' },
    { label: 'percent encoded', value: `%76${evidence.slice(1)}` },
    { label: 'quoted', value: `"${evidence}"` },
    { label: 'padded', value: `${evidence}=` },
    { label: 'leading whitespace', value: ` ${evidence}` },
    { label: 'trailing whitespace', value: `${evidence} ` },
    { label: 'changed version casing', value: `V${evidence.slice(1)}` },
  ])('normalizes $label evidence without resolution', async ({ value }) => {
    const resolver = new RecordingSessionResolution(undefined);
    const response = await appWith(resolver).inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${value}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { state: 'anonymous' } });
    expect(resolver.calls).toEqual([]);
  });

  it('normalizes duplicate configured cookies without resolution', async () => {
    const resolver = new RecordingSessionResolution(undefined);
    const response = await appWith(resolver).inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${evidence}; ${cookieName}=${evidence}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: { state: 'anonymous' } });
    expect(resolver.calls).toEqual([]);
  });

  it('captures one request time and returns the stable authenticated response', async () => {
    const evaluatedAt = new Date('2026-08-05T18:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(evaluatedAt);
    const resolver = new RecordingSessionResolution({
      state: 'authenticated',
      userId: 'user-synthetic-http-001',
      expiresAt: new Date('2026-08-05T19:00:00Z'),
      selectedBusinessId: 'business-synthetic-http-001',
    });
    const response = await appWith(resolver).inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${evidence}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers).not.toHaveProperty('set-cookie');
    const body = currentSessionInspectionResponseSchema.parse(response.json<unknown>());
    expect(body).toEqual({
      data: {
        state: 'authenticated',
        userId: 'user-synthetic-http-001',
        expiresAt: '2026-08-05T19:00:00.000Z',
        selectedBusiness: { businessId: 'business-synthetic-http-001' },
      },
    });
    expect(resolver.calls).toHaveLength(1);
    expect(resolver.calls[0]?.evaluatedAt).toEqual(evaluatedAt);
    expect(JSON.stringify(resolver.calls)).not.toContain(evidence);
  });

  it('maps infrastructure failure to safe Problem Details without leaking internal data', async () => {
    const internalDetail = `synthetic database failure ${evidence} ${encodedKey}`;
    const resolver = new RecordingSessionResolution(undefined, new Error(internalDetail));
    const response = await appWith(resolver).inject({
      method: 'GET',
      url: '/api/v1/session',
      headers: { cookie: `${cookieName}=${evidence}` },
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers).not.toHaveProperty('set-cookie');
    const body = problemDetailsSchema.parse(response.json<unknown>());
    expect(body).toMatchObject({
      type: 'about:blank',
      title: 'Internal failure',
      status: 500,
      code: 'INTERNAL_FAILURE',
      detail: 'The request could not be completed.',
      retry: 'afterDelay',
      commitState: 'notApplicable',
      freshStateRequired: false,
    });
    expect(body.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).not.toContain(internalDetail);
    expect(response.body).not.toContain(evidence);
    expect(response.body).not.toContain(encodedKey);
  });

  it('rejects invalid HMAC bytes while constructing the application', () => {
    const resolver = new RecordingSessionResolution(undefined);

    expect(() =>
      buildApp({
        sessionConfiguration: { cookieName, hmacKey: new Uint8Array(31) },
        sessionResolution: resolver,
      }),
    ).toThrow('Session HMAC key must contain at least 32 bytes.');
    expect(resolver.calls).toEqual([]);
  });
});
