import { createHmac } from 'node:crypto';

import { normalizePrimaryEmail } from '@sem-caderno/application';

import { deriveSignInRateLimitAccountKey } from '../src/sign-in-rate-limit-account-key.js';

const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => index);
const normalizedEmail = normalizePrimaryEmail('Operator.Synthetic+one@Example.TEST');

describe('sign-in rate-limit account-key derivation', () => {
  it('matches the fixed version 1 known-answer vector', () => {
    expect(deriveSignInRateLimitAccountKey(normalizedEmail, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: 'YV-kO7LZUkfD6L-F0j_xvhQbJKxHy2gIkIOejCM_GTg',
    });
  });

  it('uses the exact domain, zero separator, and accepted normalized-email bytes', () => {
    const expected = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/sign-in-rate-limit/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(Buffer.from(normalizedEmail, 'utf8'))
      .digest('base64url');
    const alternateIdentity = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/sign-in-rate-limit/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(Buffer.from('different.synthetic@example.test', 'utf8'))
      .digest('base64url');
    const alternateDomain = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-lookup/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(Buffer.from(normalizedEmail, 'utf8'))
      .digest('base64url');

    const accountKey = deriveSignInRateLimitAccountKey(normalizedEmail, hmacKey);
    expect(accountKey.digestBase64Url).toBe(expected);
    expect(accountKey.digestBase64Url).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(accountKey.digestBase64Url).not.toBe(alternateIdentity);
    expect(accountKey.digestBase64Url).not.toBe(alternateDomain);
    expect(
      deriveSignInRateLimitAccountKey(normalizePrimaryEmail(normalizedEmail), hmacKey),
    ).toEqual(accountKey);
  });

  it('propagates server-key configuration failure without exposing identity or key material', () => {
    expect(() => deriveSignInRateLimitAccountKey(normalizedEmail, new Uint8Array(31))).toThrow(
      'Session HMAC key must contain at least 32 bytes.',
    );

    try {
      deriveSignInRateLimitAccountKey(normalizedEmail, new Uint8Array(31));
    } catch (error) {
      expect(String(error)).not.toContain(normalizedEmail);
      expect(String(error)).not.toContain('0,0,0');
    }
  });
});
