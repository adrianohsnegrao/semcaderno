import { createHmac } from 'node:crypto';

import type { SessionLookupKey } from '@sem-caderno/application';

const credentialPattern = /^v1\.([A-Za-z0-9_-]{43})$/;
const lookupDomain = Buffer.from('sem-caderno/session-lookup/v1', 'utf8');
const separator = Buffer.from([0]);

export const assertSessionHmacKey = (hmacKey: Uint8Array): void => {
  if (hmacKey.byteLength < 32) {
    throw new Error('Session HMAC key must contain at least 32 bytes.');
  }
};

export const deriveSessionLookupKey = (
  evidence: string,
  hmacKey: Uint8Array,
): SessionLookupKey | undefined => {
  assertSessionHmacKey(hmacKey);

  const match = credentialPattern.exec(evidence);
  const encodedCredential = match?.[1];
  if (encodedCredential === undefined) {
    return undefined;
  }

  const credentialBytes = Buffer.from(encodedCredential, 'base64url');
  if (
    credentialBytes.byteLength !== 32 ||
    credentialBytes.toString('base64url') !== encodedCredential
  ) {
    return undefined;
  }

  const digestBase64Url = createHmac('sha256', hmacKey)
    .update(lookupDomain)
    .update(separator)
    .update(credentialBytes)
    .digest('base64url');

  return Object.freeze({ digestVersion: 1, digestBase64Url });
};
