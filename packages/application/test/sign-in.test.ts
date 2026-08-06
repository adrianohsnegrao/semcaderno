import {
  normalizePrimaryEmail,
  type AuthenticatedCsrfDigest,
  type IssueSessionInput,
  type IssuedSession,
  type PasswordVerificationPort,
  type PasswordVerificationResult,
  type PreSessionCsrfDigest,
  type SessionCredentialDigest,
  type SessionIssuanceTransactionPort,
  type VerifyPasswordInput,
} from '../src/index.js';

const normalizedEmail = normalizePrimaryEmail('Operator.Synthetic+one@Example.TEST');

describe('primary email normalization', () => {
  it('normalizes the complete accepted ASCII mailbox deterministically', () => {
    expect(normalizedEmail).toBe('operator.synthetic+one@example.test');
    expect(normalizePrimaryEmail(normalizedEmail)).toBe(normalizedEmail);
    expect(normalizePrimaryEmail('OPERATOR.SYNTHETIC+ONE@EXAMPLE.TEST')).toBe(normalizedEmail);
  });

  it.each([
    '',
    ' operator@example.test',
    'operator@example.test ',
    'operator..synthetic@example.test',
    '.operator@example.test',
    'operator.@example.test',
    'operator@example-.test',
    'operator@exa_mple.test',
    'operator@@example.test',
    'operátor@example.test',
  ])('rejects unsupported primary-email input without echoing it: %#', (email) => {
    expect(() => normalizePrimaryEmail(email)).toThrow(
      'Primary email does not match the accepted ASCII mailbox profile.',
    );
  });
});

describe('password verification application port', () => {
  const input: VerifyPasswordInput = Object.freeze({
    normalizedEmail,
    normalizedPassword: 'synthetic-password-evidence',
  });

  it.each<PasswordVerificationResult>([
    { outcome: 'verified', userId: 'user-synthetic-verification-001' },
    { outcome: 'emailVerificationRequired', userId: 'user-synthetic-verification-002' },
    { outcome: 'invalid' },
  ])('preserves the explicit verification outcome %#', async (result) => {
    const verifier: PasswordVerificationPort = {
      verify(received) {
        expect(received).toBe(input);
        return Promise.resolve(result);
      },
    };

    await expect(verifier.verify(input)).resolves.toBe(result);
  });

  it('keeps verifier infrastructure failure distinct from invalid credentials', async () => {
    const failure = new Error('synthetic verifier infrastructure failure');
    const verifier: PasswordVerificationPort = {
      verify() {
        return Promise.reject(failure);
      },
    };

    await expect(verifier.verify(input)).rejects.toBe(failure);
    expect({ outcome: 'invalid' } satisfies PasswordVerificationResult).toEqual({
      outcome: 'invalid',
    });
  });
});

describe('digest-only session issuance application port', () => {
  const sessionCredentialDigest = Object.freeze({
    digestVersion: 1,
    digestBase64Url: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  }) as SessionCredentialDigest;
  const priorSessionCredentialDigest = Object.freeze({
    digestVersion: 1,
    digestBase64Url: 'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
  }) as SessionCredentialDigest;
  const preSessionCsrfDigest = Object.freeze({
    digestVersion: 1,
    digestBase64Url: 'ggggggggggggggggggggggggggggggggggggggggggg',
  }) as PreSessionCsrfDigest;
  const authenticatedCsrfDigest = Object.freeze({
    digestVersion: 1,
    digestBase64Url: 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  }) as AuthenticatedCsrfDigest;

  it('passes only digest evidence and explicit lifecycle instants to issuance', async () => {
    const issuedAt = new Date('2026-08-06T00:00:00Z');
    const expiresAt = new Date('2026-08-06T12:00:00Z');
    const input: IssueSessionInput = Object.freeze({
      userId: 'user-synthetic-issuance-001',
      issuedAt,
      expiresAt,
      sessionCredentialDigest,
      preSessionCsrfDigest,
      authenticatedCsrfDigest,
      priorSessionCredentialDigest,
    });
    const result: IssuedSession = Object.freeze({ userId: input.userId, expiresAt });
    const calls: IssueSessionInput[] = [];
    const issuance: SessionIssuanceTransactionPort = {
      issue(received) {
        calls.push(received);
        return Promise.resolve(result);
      },
    };

    await expect(issuance.issue(input)).resolves.toBe(result);
    expect(calls).toEqual([input]);
    expect(Object.keys(input).sort()).toEqual([
      'authenticatedCsrfDigest',
      'expiresAt',
      'issuedAt',
      'preSessionCsrfDigest',
      'priorSessionCredentialDigest',
      'sessionCredentialDigest',
      'userId',
    ]);
    expect('selectedBusinessId' in input).toBe(false);
    expect('sessionCredential' in input).toBe(false);
    expect('csrfToken' in input).toBe(false);
    expectTypeOf(sessionCredentialDigest).not.toEqualTypeOf(preSessionCsrfDigest);
    expectTypeOf(preSessionCsrfDigest).not.toEqualTypeOf(authenticatedCsrfDigest);
    expect(issuedAt.toISOString()).toBe('2026-08-06T00:00:00.000Z');
    expect(expiresAt.toISOString()).toBe('2026-08-06T12:00:00.000Z');
  });

  it('propagates issuance infrastructure failure without creating an issued result', async () => {
    const failure = new Error('synthetic issuance infrastructure failure');
    const issuance: SessionIssuanceTransactionPort = {
      issue() {
        return Promise.reject(failure);
      },
    };

    await expect(
      issuance.issue({
        userId: 'user-synthetic-issuance-002',
        issuedAt: new Date('2026-08-06T00:00:00Z'),
        expiresAt: new Date('2026-08-06T12:00:00Z'),
        sessionCredentialDigest,
        preSessionCsrfDigest,
        authenticatedCsrfDigest,
      }),
    ).rejects.toBe(failure);
  });
});
