import { createHmac } from 'node:crypto';

import type { NormalizedEmail, SignInRateLimitAccountKey } from '@sem-caderno/application';

import { assertSessionHmacKey } from './session-credential-lookup.js';

const accountKeyDomain = Buffer.from('sem-caderno/sign-in-rate-limit/v1', 'utf8');
const separator = Buffer.from([0]);

export const deriveSignInRateLimitAccountKey = (
  normalizedEmail: NormalizedEmail,
  hmacKey: Uint8Array,
): SignInRateLimitAccountKey => {
  assertSessionHmacKey(hmacKey);

  return Object.freeze({
    digestVersion: 1,
    digestBase64Url: createHmac('sha256', hmacKey)
      .update(accountKeyDomain)
      .update(separator)
      .update(Buffer.from(normalizedEmail, 'utf8'))
      .digest('base64url'),
  }) as SignInRateLimitAccountKey;
};
