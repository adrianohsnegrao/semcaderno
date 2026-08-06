import { createHmac } from 'node:crypto';

import type { AuthenticatedCsrfDigest, PreSessionCsrfDigest } from '@sem-caderno/application';

import { assertSessionHmacKey } from './session-credential-lookup.js';

const preSessionEvidencePattern = /^p1\.([A-Za-z0-9_-]{43})$/;
const authenticatedEvidencePattern = /^c1\.([A-Za-z0-9_-]{43})$/;
const csrfDomain = Buffer.from('sem-caderno/session-csrf/v1', 'utf8');
const separator = Buffer.from([0]);

const deriveCsrfDigestBase64Url = (
  evidence: string,
  hmacKey: Uint8Array,
  evidencePattern: RegExp,
): string | undefined => {
  assertSessionHmacKey(hmacKey);

  const encodedEvidence = evidencePattern.exec(evidence)?.[1];
  if (encodedEvidence === undefined) {
    return undefined;
  }

  const evidenceBytes = Buffer.from(encodedEvidence, 'base64url');
  if (evidenceBytes.byteLength !== 32 || evidenceBytes.toString('base64url') !== encodedEvidence) {
    return undefined;
  }

  return createHmac('sha256', hmacKey)
    .update(csrfDomain)
    .update(separator)
    .update(evidenceBytes)
    .digest('base64url');
};

export const derivePreSessionCsrfDigest = (
  evidence: string,
  hmacKey: Uint8Array,
): PreSessionCsrfDigest | undefined => {
  const digestBase64Url = deriveCsrfDigestBase64Url(evidence, hmacKey, preSessionEvidencePattern);

  return digestBase64Url === undefined
    ? undefined
    : (Object.freeze({ digestVersion: 1, digestBase64Url }) as PreSessionCsrfDigest);
};

export const deriveAuthenticatedCsrfDigest = (
  evidence: string,
  hmacKey: Uint8Array,
): AuthenticatedCsrfDigest | undefined => {
  const digestBase64Url = deriveCsrfDigestBase64Url(
    evidence,
    hmacKey,
    authenticatedEvidencePattern,
  );

  return digestBase64Url === undefined
    ? undefined
    : (Object.freeze({ digestVersion: 1, digestBase64Url }) as AuthenticatedCsrfDigest);
};
