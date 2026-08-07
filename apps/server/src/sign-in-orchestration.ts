import {
  normalizePrimaryEmail,
  type PasswordVerificationPort,
  type PreSessionCsrfDigest,
  type SessionCredentialDigest,
  type SessionIssuanceTransactionPort,
  type SignInRateLimitDecision,
  type SignInRateLimitPort,
} from '@sem-caderno/application';

import {
  createSessionEvidenceGenerator,
  type SessionEvidenceByteSource,
} from './session-evidence-generation.js';
import { deriveSignInRateLimitAccountKey } from './sign-in-rate-limit-account-key.js';

const sessionLifetimeMilliseconds = 12 * 60 * 60 * 1_000;
const maximumIssuanceAttempts = 3;

export type ExecuteSignInInput = Readonly<{
  email: string;
  normalizedPassword: string;
  preSessionCsrfDigest: PreSessionCsrfDigest;
  priorSessionCredentialDigest?: SessionCredentialDigest;
  issuedAt: Date;
}>;

export type SignInResult =
  | Readonly<{
      outcome: 'issued';
      userId: string;
      expiresAt: Date;
      sessionEvidence: string;
      authenticatedCsrfEvidence: string;
    }>
  | Readonly<{ outcome: 'authenticationFailed' }>
  | Readonly<{ outcome: 'emailVerificationRequired' }>
  | Readonly<{ outcome: 'preSessionChallengeRejected' }>
  | Readonly<{ outcome: 'rateLimited'; retryAt: Date }>;

export type SignInOrchestration = Readonly<{
  execute(input: ExecuteSignInInput): Promise<SignInResult>;
}>;

export type CreateSignInOrchestrationDependencies = Readonly<{
  hmacKey: Uint8Array;
  passwordVerification: PasswordVerificationPort;
  rateLimit: SignInRateLimitPort;
  sessionIssuance: SessionIssuanceTransactionPort;
  evidenceByteSource?: SessionEvidenceByteSource;
}>;

const copyInstant = (instant: Date, message: string): Date => {
  if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
    throw new Error(message);
  }
  return new Date(instant.getTime());
};

const assertRateLimitDecision = (decision: SignInRateLimitDecision): void => {
  if (decision.outcome === 'allowed') return;
  if (decision.outcome !== 'limited') {
    throw new Error('Sign-in rate-limit decision is invalid.');
  }
  copyInstant(decision.retryAt, 'Sign-in rate-limit decision is invalid.');
};

export const createSignInOrchestration = (
  dependencies: CreateSignInOrchestrationDependencies,
): SignInOrchestration => {
  const evidenceGenerator = createSessionEvidenceGenerator({
    hmacKey: dependencies.hmacKey,
    ...(dependencies.evidenceByteSource === undefined
      ? {}
      : { byteSource: dependencies.evidenceByteSource }),
  });
  const hmacKey = Uint8Array.from(dependencies.hmacKey);

  return Object.freeze({
    async execute(input: ExecuteSignInInput): Promise<SignInResult> {
      const issuedAt = copyInstant(input.issuedAt, 'Sign-in issuance instant is invalid.');
      const expiresAt = new Date(issuedAt.getTime() + sessionLifetimeMilliseconds);
      if (!Number.isFinite(expiresAt.getTime())) {
        throw new Error('Sign-in issuance instant is invalid.');
      }

      const normalizedEmail = normalizePrimaryEmail(input.email);
      const accountKey = deriveSignInRateLimitAccountKey(normalizedEmail, hmacKey);
      const rateDecision = await dependencies.rateLimit.check({
        accountKey,
        evaluatedAt: issuedAt,
      });
      assertRateLimitDecision(rateDecision);
      if (rateDecision.outcome === 'limited') {
        return Object.freeze({
          outcome: 'rateLimited',
          retryAt: new Date(rateDecision.retryAt.getTime()),
        });
      }

      const verification = await dependencies.passwordVerification.verify({
        normalizedEmail,
        normalizedPassword: input.normalizedPassword,
      });
      if (verification.outcome === 'invalid') {
        const postFailureDecision = await dependencies.rateLimit.recordFailure({
          accountKey,
          occurredAt: issuedAt,
        });
        assertRateLimitDecision(postFailureDecision);
        return Object.freeze({ outcome: 'authenticationFailed' });
      }
      if (verification.outcome === 'emailVerificationRequired') {
        return Object.freeze({ outcome: 'emailVerificationRequired' });
      }
      if (verification.outcome !== 'verified') {
        throw new Error('Password verification result is invalid.');
      }

      for (let attempt = 1; attempt <= maximumIssuanceAttempts; attempt += 1) {
        const evidence = evidenceGenerator.generate();
        const issuance = await dependencies.sessionIssuance.issue({
          userId: verification.userId,
          issuedAt,
          expiresAt,
          signInRateLimitAccountKey: accountKey,
          sessionCredentialDigest: evidence.sessionCredentialDigest,
          preSessionCsrfDigest: input.preSessionCsrfDigest,
          authenticatedCsrfDigest: evidence.authenticatedCsrfDigest,
          ...(input.priorSessionCredentialDigest === undefined
            ? {}
            : { priorSessionCredentialDigest: input.priorSessionCredentialDigest }),
        });

        if (issuance.outcome === 'issued') {
          if (
            issuance.userId !== verification.userId ||
            !(issuance.expiresAt instanceof Date) ||
            issuance.expiresAt.getTime() !== expiresAt.getTime()
          ) {
            throw new Error('Sign-in issuance result is invalid.');
          }
          return Object.freeze({
            outcome: 'issued',
            userId: issuance.userId,
            expiresAt: new Date(issuance.expiresAt.getTime()),
            sessionEvidence: evidence.sessionEvidence,
            authenticatedCsrfEvidence: evidence.authenticatedCsrfEvidence,
          });
        }
        if (issuance.outcome === 'userRejected') {
          return Object.freeze({ outcome: 'authenticationFailed' });
        }
        if (issuance.outcome === 'preSessionChallengeRejected') {
          return Object.freeze({ outcome: 'preSessionChallengeRejected' });
        }
        if (issuance.outcome !== 'digestCollision') {
          throw new Error('Sign-in issuance result is invalid.');
        }
        if (attempt === maximumIssuanceAttempts) {
          throw new Error('Sign-in issuance collision limit was exhausted.');
        }
      }

      throw new Error('Sign-in issuance failed.');
    },
  });
};
