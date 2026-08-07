import {
  normalizePrimaryEmail,
  type PasswordVerificationPort,
  type PasswordVerificationResult,
  type SessionIssuanceResult,
  type SessionIssuanceTransactionPort,
  type SignInRateLimitDecision,
  type SignInRateLimitPort,
} from '@sem-caderno/application';

import { derivePreSessionCsrfDigest } from '../src/pre-session-csrf-digest.js';
import { deriveSessionCredentialDigest } from '../src/session-credential-lookup.js';
import {
  createSignInOrchestration,
  type CreateSignInOrchestrationDependencies,
  type ExecuteSignInInput,
} from '../src/sign-in-orchestration.js';
import { deriveSignInRateLimitAccountKey } from '../src/sign-in-rate-limit-account-key.js';

const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => index);
const email = 'Operator.Synthetic+one@Example.TEST';
const normalizedEmail = normalizePrimaryEmail(email);
const normalizedPassword = 'synthetic-password-proof';
const issuedAt = new Date('2026-08-06T12:00:00Z');
const expiresAt = new Date('2026-08-07T00:00:00Z');
const preSessionEvidence = 'p1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const priorSessionEvidence = 'v1.ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8';
const preSessionCsrfDigest = derivePreSessionCsrfDigest(preSessionEvidence, hmacKey)!;
const priorSessionCredentialDigest = deriveSessionCredentialDigest(priorSessionEvidence, hmacKey)!;
const accountKey = deriveSignInRateLimitAccountKey(normalizedEmail, hmacKey);
const userId = 'user-synthetic-orchestration-001';

const evidenceBytes = Array.from({ length: 6 }, (_, index) =>
  Uint8Array.from({ length: 32 }, (_value, byteIndex) => (index * 32 + byteIndex) % 256),
);

const defaultInput: ExecuteSignInInput = Object.freeze({
  email,
  normalizedPassword,
  preSessionCsrfDigest,
  priorSessionCredentialDigest,
  issuedAt,
});

type HarnessOptions = Readonly<{
  verification?: PasswordVerificationResult;
  checkDecision?: SignInRateLimitDecision;
  recordDecision?: SignInRateLimitDecision;
  issuanceResults?: readonly SessionIssuanceResult[];
  failure?: Readonly<{
    boundary: 'check' | 'verify' | 'recordFailure' | 'issue';
    error: Error;
  }>;
  byteValues?: readonly Uint8Array[];
}>;

const createHarness = (options: HarnessOptions = {}) => {
  const events: string[] = [];
  const values = [...(options.byteValues ?? evidenceBytes)];
  let byteIndex = 0;
  const byteSource = vi.fn((size: number) => {
    expect(size).toBe(32);
    if (byteIndex % 2 === 0) events.push('generate');
    const value = values[byteIndex];
    byteIndex += 1;
    if (value === undefined) throw new Error('Synthetic byte source exhausted.');
    return value;
  });
  const check = vi.fn(() => {
    events.push('check');
    if (options.failure?.boundary === 'check') return Promise.reject(options.failure.error);
    return Promise.resolve(options.checkDecision ?? ({ outcome: 'allowed' } as const));
  });
  const recordFailure = vi.fn(() => {
    events.push('recordFailure');
    if (options.failure?.boundary === 'recordFailure') {
      return Promise.reject(options.failure.error);
    }
    return Promise.resolve(options.recordDecision ?? ({ outcome: 'allowed' } as const));
  });
  const clear = vi.fn(() => Promise.resolve());
  const verify = vi.fn(() => {
    events.push('verify');
    if (options.failure?.boundary === 'verify') return Promise.reject(options.failure.error);
    return Promise.resolve(options.verification ?? ({ outcome: 'verified', userId } as const));
  });
  const issuanceResults = [...(options.issuanceResults ?? [])];
  const issue = vi.fn(
    (
      input: Parameters<SessionIssuanceTransactionPort['issue']>[0],
    ): Promise<SessionIssuanceResult> => {
      events.push('issue');
      if (options.failure?.boundary === 'issue') return Promise.reject(options.failure.error);
      return Promise.resolve(
        issuanceResults.shift() ?? {
          outcome: 'issued',
          userId: input.userId,
          expiresAt: input.expiresAt,
        },
      );
    },
  );
  const passwordVerification: PasswordVerificationPort = { verify };
  const rateLimit: SignInRateLimitPort = { check, recordFailure, clear };
  const sessionIssuance: SessionIssuanceTransactionPort = { issue };
  const dependencies: CreateSignInOrchestrationDependencies = {
    hmacKey,
    passwordVerification,
    rateLimit,
    sessionIssuance,
    evidenceByteSource: byteSource,
  };

  return {
    subject: createSignInOrchestration(dependencies),
    events,
    byteSource,
    check,
    recordFailure,
    clear,
    verify,
    issue,
  };
};

describe('server-owned sign-in orchestration', () => {
  it('coordinates one successful verification and atomic issuance with exact safe evidence output', async () => {
    const harness = createHarness();

    const result = await harness.subject.execute(defaultInput);

    expect(result).toEqual({
      outcome: 'issued',
      userId,
      expiresAt,
      sessionEvidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
      authenticatedCsrfEvidence: 'c1.ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8',
    });
    expect(harness.events).toEqual(['check', 'verify', 'generate', 'issue']);
    expect(harness.check).toHaveBeenCalledWith({ accountKey, evaluatedAt: issuedAt });
    expect(harness.verify).toHaveBeenCalledWith({ normalizedEmail, normalizedPassword });
    expect(harness.issue).toHaveBeenCalledWith({
      userId,
      issuedAt,
      expiresAt,
      signInRateLimitAccountKey: accountKey,
      sessionCredentialDigest: {
        digestVersion: 1,
        digestBase64Url: 'dmxL-7uFNS2JxmVCRg6FckHDIMN8KAM-MnM3G0-DifI',
      },
      preSessionCsrfDigest,
      authenticatedCsrfDigest: {
        digestVersion: 1,
        digestBase64Url: 'ZAEVHppU1ItZj9yPBYL__uWwGclDV5AuZ81WAYap2b8',
      },
      priorSessionCredentialDigest,
    });
    expect(JSON.stringify(harness.issue.mock.calls)).not.toContain(preSessionEvidence);
    expect(JSON.stringify(harness.issue.mock.calls)).not.toContain(priorSessionEvidence);
    expect(harness.recordFailure).not.toHaveBeenCalled();
    expect(harness.clear).not.toHaveBeenCalled();
  });

  it('stops before password verification when the account key is already limited', async () => {
    const retryAt = new Date('2026-08-06T12:15:00Z');
    const harness = createHarness({ checkDecision: { outcome: 'limited', retryAt } });

    await expect(harness.subject.execute(defaultInput)).resolves.toEqual({
      outcome: 'rateLimited',
      retryAt,
    });
    expect(harness.events).toEqual(['check']);
    expect(harness.verify).not.toHaveBeenCalled();
    expect(harness.recordFailure).not.toHaveBeenCalled();
    expect(harness.byteSource).not.toHaveBeenCalled();
    expect(harness.issue).not.toHaveBeenCalled();
  });

  it('records only an invalid password proof and keeps the current outcome generic at threshold', async () => {
    const harness = createHarness({
      verification: { outcome: 'invalid' },
      recordDecision: { outcome: 'limited', retryAt: new Date('2026-08-06T12:15:00Z') },
    });

    await expect(harness.subject.execute(defaultInput)).resolves.toEqual({
      outcome: 'authenticationFailed',
    });
    expect(harness.events).toEqual(['check', 'verify', 'recordFailure']);
    expect(harness.recordFailure).toHaveBeenCalledWith({ accountKey, occurredAt: issuedAt });
    expect(harness.byteSource).not.toHaveBeenCalled();
    expect(harness.issue).not.toHaveBeenCalled();
  });

  it('does not count or issue after a verified but unverified-email outcome', async () => {
    const harness = createHarness({
      verification: { outcome: 'emailVerificationRequired', userId },
    });

    await expect(harness.subject.execute(defaultInput)).resolves.toEqual({
      outcome: 'emailVerificationRequired',
    });
    expect(harness.events).toEqual(['check', 'verify']);
    expect(harness.recordFailure).not.toHaveBeenCalled();
    expect(harness.byteSource).not.toHaveBeenCalled();
    expect(harness.issue).not.toHaveBeenCalled();
  });

  it.each([
    {
      issuanceResult: { outcome: 'userRejected' } as const,
      expected: { outcome: 'authenticationFailed' } as const,
    },
    {
      issuanceResult: { outcome: 'preSessionChallengeRejected' } as const,
      expected: { outcome: 'preSessionChallengeRejected' } as const,
    },
  ])('maps $issuanceResult.outcome without retrying', async ({ issuanceResult, expected }) => {
    const harness = createHarness({ issuanceResults: [issuanceResult] });

    await expect(harness.subject.execute(defaultInput)).resolves.toEqual(expected);
    expect(harness.events).toEqual(['check', 'verify', 'generate', 'issue']);
    expect(harness.byteSource).toHaveBeenCalledTimes(2);
    expect(harness.issue).toHaveBeenCalledTimes(1);
    expect(harness.recordFailure).not.toHaveBeenCalled();
  });

  it('regenerates both evidence values and succeeds on the third complete issuance attempt', async () => {
    const harness = createHarness({
      issuanceResults: [
        { outcome: 'digestCollision' },
        { outcome: 'digestCollision' },
        { outcome: 'issued', userId, expiresAt },
      ],
    });

    const result = await harness.subject.execute(defaultInput);

    expect(result).toMatchObject({
      outcome: 'issued',
      sessionEvidence: 'v1.gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp8',
      authenticatedCsrfEvidence: 'c1.oKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr8',
    });
    expect(harness.events).toEqual([
      'check',
      'verify',
      'generate',
      'issue',
      'generate',
      'issue',
      'generate',
      'issue',
    ]);
    expect(harness.byteSource).toHaveBeenCalledTimes(6);
    expect(harness.issue).toHaveBeenCalledTimes(3);
    const attempts = harness.issue.mock.calls.map(([input]) => ({
      session: input.sessionCredentialDigest.digestBase64Url,
      csrf: input.authenticatedCsrfDigest.digestBase64Url,
    }));
    expect(new Set(attempts.map((attempt) => attempt.session))).toHaveLength(3);
    expect(new Set(attempts.map((attempt) => attempt.csrf))).toHaveLength(3);
    expect(harness.check).toHaveBeenCalledTimes(1);
    expect(harness.verify).toHaveBeenCalledTimes(1);
  });

  it('fails closed after exactly three digest collisions without exposing generated evidence', async () => {
    const harness = createHarness({
      issuanceResults: Array.from({ length: 3 }, () => ({ outcome: 'digestCollision' }) as const),
    });

    let failure: unknown;
    try {
      await harness.subject.execute(defaultInput);
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(new Error('Sign-in issuance collision limit was exhausted.'));
    expect(String(failure)).not.toContain('v1.');
    expect(String(failure)).not.toContain('c1.');
    expect(harness.byteSource).toHaveBeenCalledTimes(6);
    expect(harness.issue).toHaveBeenCalledTimes(3);
  });

  it('does not retry an unknown issuance result as a digest collision', async () => {
    const harness = createHarness({
      issuanceResults: [{ outcome: 'unknown' } as unknown as SessionIssuanceResult],
    });

    await expect(harness.subject.execute(defaultInput)).rejects.toThrow(
      'Sign-in issuance result is invalid.',
    );
    expect(harness.byteSource).toHaveBeenCalledTimes(2);
    expect(harness.issue).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown verifier result before generating evidence', async () => {
    const harness = createHarness({
      verification: { outcome: 'unknown' } as unknown as PasswordVerificationResult,
    });

    await expect(harness.subject.execute(defaultInput)).rejects.toThrow(
      'Password verification result is invalid.',
    );
    expect(harness.byteSource).not.toHaveBeenCalled();
    expect(harness.issue).not.toHaveBeenCalled();
  });

  it.each(['check', 'recordFailure'] as const)(
    'rejects an unknown %s rate decision instead of continuing',
    async (boundary) => {
      const unknownDecision = {
        outcome: 'unknown',
        retryAt: new Date('2026-08-06T12:15:00Z'),
      } as unknown as SignInRateLimitDecision;
      const harness = createHarness({
        ...(boundary === 'check'
          ? { checkDecision: unknownDecision }
          : { verification: { outcome: 'invalid' } as const, recordDecision: unknownDecision }),
      });

      await expect(harness.subject.execute(defaultInput)).rejects.toThrow(
        'Sign-in rate-limit decision is invalid.',
      );
      expect(harness.byteSource).not.toHaveBeenCalled();
      expect(harness.issue).not.toHaveBeenCalled();
    },
  );

  it.each(['check', 'verify', 'recordFailure', 'issue'] as const)(
    'propagates %s infrastructure failure without converting it to an expected outcome',
    async (boundary) => {
      const failure = new Error(`synthetic ${boundary} infrastructure failure`);
      const harness = createHarness({
        ...(boundary === 'recordFailure' ? { verification: { outcome: 'invalid' } as const } : {}),
        failure: { boundary, error: failure },
      });

      await expect(harness.subject.execute(defaultInput)).rejects.toBe(failure);
    },
  );

  it('rejects CSPRNG failure through the generator safe boundary without issuing', async () => {
    const harness = createHarness({ byteValues: [] });

    await expect(harness.subject.execute(defaultInput)).rejects.toThrow(
      'Session evidence generation failed.',
    );
    expect(harness.issue).not.toHaveBeenCalled();
  });

  it('rejects an inconsistent committed result instead of publishing evidence', async () => {
    const harness = createHarness({
      issuanceResults: [
        {
          outcome: 'issued',
          userId: 'different-user-synthetic',
          expiresAt,
        },
      ],
    });

    await expect(harness.subject.execute(defaultInput)).rejects.toThrow(
      'Sign-in issuance result is invalid.',
    );
  });

  it('rejects invalid operation input before invoking infrastructure', async () => {
    const harness = createHarness();

    await expect(
      harness.subject.execute({ ...defaultInput, issuedAt: new Date(Number.NaN) }),
    ).rejects.toThrow('Sign-in issuance instant is invalid.');
    await expect(
      harness.subject.execute({ ...defaultInput, email: 'not an accepted email' }),
    ).rejects.toThrow('Primary email does not match the accepted ASCII mailbox profile.');
    expect(harness.events).toEqual([]);
  });

  it('copies construction key ownership and does not mutate caller input', async () => {
    const mutableKey = Uint8Array.from(hmacKey);
    const harness = createHarness();
    const dependencies: CreateSignInOrchestrationDependencies = {
      hmacKey: mutableKey,
      passwordVerification: { verify: harness.verify },
      rateLimit: {
        check: harness.check,
        recordFailure: harness.recordFailure,
        clear: harness.clear,
      },
      sessionIssuance: { issue: harness.issue },
      evidenceByteSource: harness.byteSource,
    };
    const subject = createSignInOrchestration(dependencies);
    mutableKey.fill(255);

    await expect(subject.execute(defaultInput)).resolves.toMatchObject({ outcome: 'issued' });
    expect(harness.check).toHaveBeenCalledWith({ accountKey, evaluatedAt: issuedAt });
    expect(defaultInput.email).toBe(email);
    expect(defaultInput.issuedAt).toBe(issuedAt);
    expect(issuedAt.toISOString()).toBe('2026-08-06T12:00:00.000Z');
  });
});
