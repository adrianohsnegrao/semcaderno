import { createHmac } from 'node:crypto';

import { derivePreSessionCsrfDigest } from '../src/pre-session-csrf-digest.js';

const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const canonicalEvidence = 'p1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

describe('pre-session CSRF digest derivation', () => {
  it('matches the fixed version 1 known-answer vector', () => {
    expect(derivePreSessionCsrfDigest(canonicalEvidence, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: '8HWveVp0r11tKBBQD1csAcgryncunkdRv6BM0XBiYMc',
    });
  });

  it('uses the accepted CSRF domain-separated byte sequence exactly once', () => {
    const evidenceBytes = Buffer.from(canonicalEvidence.slice(3), 'base64url');
    const expected = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-csrf/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(evidenceBytes)
      .digest('base64url');
    const alternate = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-lookup/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(evidenceBytes)
      .digest('base64url');

    expect(derivePreSessionCsrfDigest(canonicalEvidence, hmacKey)?.digestBase64Url).toBe(expected);
    expect(expected).not.toBe(alternate);
  });

  it.each([
    '',
    `p2.${canonicalEvidence.slice(3)}`,
    `p1.${canonicalEvidence.slice(3)}=`,
    `p1.${canonicalEvidence.slice(3, -1)}`,
    `p1.${canonicalEvidence.slice(3, -1)}+`,
    ` p1.${canonicalEvidence.slice(3)}`,
  ])('rejects malformed evidence without repair: %#', (evidence) => {
    expect(derivePreSessionCsrfDigest(evidence, hmacKey)).toBeUndefined();
  });

  it('propagates HMAC configuration failure without exposing evidence or key material', () => {
    expect(() => derivePreSessionCsrfDigest(canonicalEvidence, new Uint8Array(31))).toThrow(
      'Session HMAC key must contain at least 32 bytes.',
    );

    try {
      derivePreSessionCsrfDigest(canonicalEvidence, new Uint8Array(31));
    } catch (error) {
      expect(String(error)).not.toContain(canonicalEvidence);
      expect(String(error)).not.toContain('0,0,0');
    }
  });
});
