import * as contractPublicApi from '../src/index.js';
import {
  authenticationContractLimits,
  problemDetailsSchema,
  sessionBootstrapResponseSchema,
  signInRequestSchema,
  signInResponseSchema,
  transportCodeSchema,
  type SignInRequest,
} from '../src/index.js';

const canonicalPayload = 'A'.repeat(43);
const synthetic = {
  authenticatedCsrfToken: `c1.${canonicalPayload}`,
  email: 'Operator.Synthetic+one@Example.TEST',
  preSessionCsrfToken: `p1.${canonicalPayload}`,
  userId: 'user-synthetic-authentication-001',
} as const;

describe('ID00 session bootstrap contract', () => {
  it('accepts the canonical response and strips additive response fields', () => {
    expect(
      sessionBootstrapResponseSchema.parse({
        data: {
          csrfToken: synthetic.preSessionCsrfToken,
          expiresAt: '2026-08-06T00:10:00Z',
          futureSafeField: true,
        },
        futureEnvelopeField: 'synthetic',
      }),
    ).toEqual({
      data: {
        csrfToken: synthetic.preSessionCsrfToken,
        expiresAt: '2026-08-06T00:10:00Z',
      },
    });
  });

  it.each([
    { data: { expiresAt: '2026-08-06T00:10:00Z' } },
    { data: { csrfToken: synthetic.preSessionCsrfToken } },
    { data: { csrfToken: `c1.${canonicalPayload}`, expiresAt: '2026-08-06T00:10:00Z' } },
    { data: { csrfToken: `p1.${'A'.repeat(42)}B`, expiresAt: '2026-08-06T00:10:00Z' } },
    { data: { csrfToken: `${synthetic.preSessionCsrfToken}=`, expiresAt: '2026-08-06T00:10:00Z' } },
    { data: { csrfToken: synthetic.preSessionCsrfToken, expiresAt: '2026-08-05T20:10:00-04:00' } },
  ])('rejects invalid bootstrap response %#', (response) => {
    expect(sessionBootstrapResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('ID04 sign-in request contract', () => {
  it('accepts only the strict email/password request and normalizes password NFC', () => {
    const input = Object.freeze({ email: synthetic.email, password: 'synthetic-e\u0301vidence' });

    expect(signInRequestSchema.parse(input)).toEqual({
      email: synthetic.email,
      password: 'synthetic-évidence',
    });
    expect(input).toEqual({ email: synthetic.email, password: 'synthetic-e\u0301vidence' });
  });

  it.each([
    { email: synthetic.email, password: 'synthetic', extra: true },
    { email: ` ${synthetic.email}`, password: 'synthetic' },
    { email: 'operator..synthetic@example.test', password: 'synthetic' },
    { email: '.operator@example.test', password: 'synthetic' },
    { email: 'operator@example-.test', password: 'synthetic' },
    { email: 'operator@exa_mple.test', password: 'synthetic' },
    { email: 'operátor@example.test', password: 'synthetic' },
    { email: 'operator@example.test', password: '' },
    { email: 'operator@example.test', password: '\ud800' },
    { email: 'operator@example.test', password: 'synthetic', nullable: null },
  ])('rejects invalid request %#', (request) => {
    expect(signInRequestSchema.safeParse(request).success).toBe(false);
  });

  it('enforces exact accepted email and password boundaries', () => {
    const maximumEmail = `${'a'.repeat(241)}@example.test`;
    expect(maximumEmail).toHaveLength(authenticationContractLimits.emailBytesMaximum);
    expect(
      signInRequestSchema.safeParse({ email: maximumEmail, password: 'synthetic' }).success,
    ).toBe(true);
    expect(
      signInRequestSchema.safeParse({ email: `${maximumEmail}x`, password: 'synthetic' }).success,
    ).toBe(false);

    const maximumPassword = '😀'.repeat(authenticationContractLimits.passwordScalarValuesMaximum);
    expect(new TextEncoder().encode(maximumPassword)).toHaveLength(
      authenticationContractLimits.passwordUtf8BytesMaximum,
    );
    expect(
      signInRequestSchema.safeParse({ email: synthetic.email, password: maximumPassword }).success,
    ).toBe(true);
    expect(
      signInRequestSchema.safeParse({ email: synthetic.email, password: `${maximumPassword}a` })
        .success,
    ).toBe(false);
  });

  it('infers the reviewed request shape', () => {
    const request = {
      email: synthetic.email,
      password: 'synthetic-password',
    } satisfies SignInRequest;

    expect(signInRequestSchema.parse(request)).toEqual(request);
  });
});

describe('ID04 sign-in response and failure contract', () => {
  it('accepts authenticated safe data without session, digest, or authorization fields', () => {
    expect(
      signInResponseSchema.parse({
        data: {
          state: 'authenticated',
          userId: synthetic.userId,
          expiresAt: '2026-08-06T12:00:00Z',
          csrfToken: synthetic.authenticatedCsrfToken,
          futureSafeField: true,
        },
      }),
    ).toEqual({
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-06T12:00:00Z',
        csrfToken: synthetic.authenticatedCsrfToken,
      },
    });
  });

  it.each([
    { data: { state: 'anonymous' } },
    {
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-06T12:00:00Z',
        csrfToken: `p1.${canonicalPayload}`,
      },
    },
    {
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-06T12:00:00Z',
        csrfToken: `c1.${'A'.repeat(42)}B`,
      },
    },
  ])('rejects invalid sign-in response %#', (response) => {
    expect(signInResponseSchema.safeParse(response).success).toBe(false);
  });

  it('accepts only the generic authentication failure identity at HTTP 401', () => {
    expect(transportCodeSchema.parse('AUTHENTICATION_FAILED')).toBe('AUTHENTICATION_FAILED');
    expect(
      problemDetailsSchema.parse({
        type: 'https://errors.invalid/authentication-failed',
        title: 'Authentication failed',
        status: 401,
        code: 'AUTHENTICATION_FAILED',
        detail: 'Authentication could not be completed.',
        correlationId: 'correlation-synthetic-authentication-001',
        retry: 'afterCorrection',
        commitState: 'notCommitted',
        freshStateRequired: false,
      }).code,
    ).toBe('AUTHENTICATION_FAILED');
    expect(
      problemDetailsSchema.safeParse({
        type: 'https://errors.invalid/authentication-failed',
        title: 'Authentication failed',
        status: 403,
        code: 'AUTHENTICATION_FAILED',
        detail: 'Authentication could not be completed.',
        correlationId: 'correlation-synthetic-authentication-001',
        retry: 'afterCorrection',
        commitState: 'notCommitted',
        freshStateRequired: false,
      }).success,
    ).toBe(false);
  });

  it('parses deterministically into JSON-safe output without mutating input', () => {
    const input = Object.freeze({
      data: Object.freeze({
        state: 'authenticated' as const,
        userId: synthetic.userId,
        expiresAt: '2026-08-06T12:00:00Z',
        csrfToken: synthetic.authenticatedCsrfToken,
      }),
    });
    const first = signInResponseSchema.parse(input);
    const second = signInResponseSchema.parse(input);

    expect(first).toEqual(second);
    expect(first).not.toBe(input);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(input.data.csrfToken).toBe(synthetic.authenticatedCsrfToken);
  });

  it('does not export server-only credential, digest, key, or verifier schemas', () => {
    for (const forbiddenExport of [
      'sessionCredentialSchema',
      'sessionCredentialDigestSchema',
      'authenticatedCsrfDigestSchema',
      'sessionHmacKeySchema',
      'passwordHashSchema',
      'passwordVerifierSchema',
    ]) {
      expect(contractPublicApi).not.toHaveProperty(forbiddenExport);
    }
  });
});
