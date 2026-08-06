import { createHmac } from 'node:crypto';

import type { PreSessionCsrfDigest } from '@sem-caderno/application';

import { assertSessionHmacKey } from './session-credential-lookup.js';

const evidencePattern = /^p1\.([A-Za-z0-9_-]{43})$/;
const csrfDomain = Buffer.from('sem-caderno/session-csrf/v1', 'utf8');
const separator = Buffer.from([0]);

export const derivePreSessionCsrfDigest = (
  evidence: string,
  hmacKey: Uint8Array,
): PreSessionCsrfDigest | undefined => {
  assertSessionHmacKey(hmacKey);

  const encodedEvidence = evidencePattern.exec(evidence)?.[1];
  if (encodedEvidence === undefined) {
    return undefined;
  }

  const evidenceBytes = Buffer.from(encodedEvidence, 'base64url');
  if (evidenceBytes.byteLength !== 32 || evidenceBytes.toString('base64url') !== encodedEvidence) {
    return undefined;
  }

  return Object.freeze({
    digestVersion: 1,
    digestBase64Url: createHmac('sha256', hmacKey)
      .update(csrfDomain)
      .update(separator)
      .update(evidenceBytes)
      .digest('base64url'),
  }) as PreSessionCsrfDigest;
};
