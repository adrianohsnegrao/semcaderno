import { randomBytes } from 'node:crypto';

import type { AuthenticatedCsrfDigest, SessionCredentialDigest } from '@sem-caderno/application';

import { deriveAuthenticatedCsrfDigest } from './pre-session-csrf-digest.js';
import {
  assertSessionHmacKey,
  deriveSessionCredentialDigest,
} from './session-credential-lookup.js';

const evidenceByteLength = 32;

export type SessionEvidenceByteSource = (size: number) => Uint8Array;

export type GeneratedSessionEvidence = Readonly<{
  sessionEvidence: string;
  sessionCredentialDigest: SessionCredentialDigest;
  authenticatedCsrfEvidence: string;
  authenticatedCsrfDigest: AuthenticatedCsrfDigest;
}>;

export type SessionEvidenceGenerator = Readonly<{
  generate(): GeneratedSessionEvidence;
}>;

export type CreateSessionEvidenceGeneratorDependencies = Readonly<{
  hmacKey: Uint8Array;
  byteSource?: SessionEvidenceByteSource;
}>;

const defaultByteSource: SessionEvidenceByteSource = (size) => randomBytes(size);

const readEvidenceBytes = (byteSource: SessionEvidenceByteSource): Buffer => {
  const bytes = byteSource(evidenceByteLength);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength !== evidenceByteLength) {
    throw new Error('Session evidence byte source returned an invalid result.');
  }

  return Buffer.from(bytes);
};

export const createSessionEvidenceGenerator = (
  dependencies: CreateSessionEvidenceGeneratorDependencies,
): SessionEvidenceGenerator => {
  assertSessionHmacKey(dependencies.hmacKey);

  const hmacKey = Uint8Array.from(dependencies.hmacKey);
  const byteSource = dependencies.byteSource ?? defaultByteSource;

  return Object.freeze({
    generate(): GeneratedSessionEvidence {
      try {
        const sessionEvidence = `v1.${readEvidenceBytes(byteSource).toString('base64url')}`;
        const authenticatedCsrfEvidence = `c1.${readEvidenceBytes(byteSource).toString('base64url')}`;
        const sessionCredentialDigest = deriveSessionCredentialDigest(sessionEvidence, hmacKey);
        const authenticatedCsrfDigest = deriveAuthenticatedCsrfDigest(
          authenticatedCsrfEvidence,
          hmacKey,
        );

        if (sessionCredentialDigest === undefined || authenticatedCsrfDigest === undefined) {
          throw new Error('Generated evidence did not match its canonical representation.');
        }

        return Object.freeze({
          sessionEvidence,
          sessionCredentialDigest,
          authenticatedCsrfEvidence,
          authenticatedCsrfDigest,
        });
      } catch {
        throw new Error('Session evidence generation failed.');
      }
    },
  });
};
