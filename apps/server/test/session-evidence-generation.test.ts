import { createHmac } from 'node:crypto';

import { createSessionEvidenceGenerator } from '../src/index.js';
import { deriveAuthenticatedCsrfDigest } from '../src/pre-session-csrf-digest.js';
import { deriveSessionCredentialDigest } from '../src/session-credential-lookup.js';

const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const sessionBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
const authenticatedCsrfBytes = Uint8Array.from({ length: 32 }, (_, index) => index + 32);
const sessionEvidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const authenticatedCsrfEvidence = 'c1.ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8';

const createQueuedByteSource = (...values: Uint8Array[]) => {
  let index = 0;
  return vi.fn((size: number): Uint8Array => {
    expect(size).toBe(32);
    const value = values[index];
    index += 1;
    if (value === undefined) throw new Error('Test byte source is exhausted.');
    return value;
  });
};

describe('session and authenticated-CSRF evidence generation', () => {
  it('generates the exact versioned representations from two independent byte-source calls', () => {
    const byteSource = createQueuedByteSource(sessionBytes, authenticatedCsrfBytes);
    const generated = createSessionEvidenceGenerator({ hmacKey, byteSource }).generate();

    expect(byteSource).toHaveBeenCalledTimes(2);
    expect(byteSource.mock.calls).toEqual([[32], [32]]);
    expect(generated.sessionEvidence).toBe(sessionEvidence);
    expect(generated.authenticatedCsrfEvidence).toBe(authenticatedCsrfEvidence);
    expect(generated.sessionCredentialDigest).toEqual({
      digestVersion: 1,
      digestBase64Url: 'niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w',
    });
    expect(generated.authenticatedCsrfDigest).toEqual({
      digestVersion: 1,
      digestBase64Url: 'GrHYnJZK-462l5JUf0zH1n2fAbAiL1ObG3aHJ_FLqrE',
    });
  });

  it('uses the exact purpose-separated domain and zero-byte framing', () => {
    const generated = createSessionEvidenceGenerator({
      hmacKey,
      byteSource: createQueuedByteSource(sessionBytes, authenticatedCsrfBytes),
    }).generate();
    const expectedSessionDigest = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-lookup/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(sessionBytes)
      .digest('base64url');
    const expectedCsrfDigest = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-csrf/v1', 'utf8'))
      .update(Buffer.from([0]))
      .update(authenticatedCsrfBytes)
      .digest('base64url');

    expect(generated.sessionCredentialDigest.digestBase64Url).toBe(expectedSessionDigest);
    expect(generated.authenticatedCsrfDigest.digestBase64Url).toBe(expectedCsrfDigest);
    expect(expectedSessionDigest).not.toBe(expectedCsrfDigest);
  });

  it('keeps purpose separation when both independent calls return the same bytes', () => {
    const byteSource = createQueuedByteSource(sessionBytes, sessionBytes);
    const generated = createSessionEvidenceGenerator({ hmacKey, byteSource }).generate();

    expect(byteSource).toHaveBeenCalledTimes(2);
    expect(generated.sessionEvidence).toBe(`v1.${Buffer.from(sessionBytes).toString('base64url')}`);
    expect(generated.authenticatedCsrfEvidence).toBe(
      `c1.${Buffer.from(sessionBytes).toString('base64url')}`,
    );
    expect(generated.sessionCredentialDigest.digestBase64Url).not.toBe(
      generated.authenticatedCsrfDigest.digestBase64Url,
    );
  });

  it('uses Node CSPRNG by default and returns only canonical full-length representations', () => {
    const generated = createSessionEvidenceGenerator({ hmacKey }).generate();

    expect(generated.sessionEvidence).toMatch(/^v1\.[A-Za-z0-9_-]{43}$/);
    expect(generated.authenticatedCsrfEvidence).toMatch(/^c1\.[A-Za-z0-9_-]{43}$/);
    expect(generated.sessionCredentialDigest.digestBase64Url).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generated.authenticatedCsrfDigest.digestBase64Url).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('copies construction-owned HMAC configuration', () => {
    const mutableKey = Uint8Array.from(hmacKey);
    const generator = createSessionEvidenceGenerator({
      hmacKey: mutableKey,
      byteSource: createQueuedByteSource(sessionBytes, authenticatedCsrfBytes),
    });
    mutableKey.fill(0);

    expect(generator.generate().sessionCredentialDigest.digestBase64Url).toBe(
      'niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w',
    );
  });

  it('rejects invalid byte-source output and runtime failure without returning evidence', () => {
    const shortSource = () => new Uint8Array(31);
    const failingSource = () => {
      throw new Error(`${sessionEvidence}: injected sensitive failure`);
    };

    expect(() =>
      createSessionEvidenceGenerator({ hmacKey, byteSource: shortSource }).generate(),
    ).toThrow('Session evidence generation failed.');
    expect(() =>
      createSessionEvidenceGenerator({ hmacKey, byteSource: failingSource }).generate(),
    ).toThrow('Session evidence generation failed.');

    try {
      createSessionEvidenceGenerator({ hmacKey, byteSource: failingSource }).generate();
    } catch (error) {
      expect(String(error)).not.toContain(sessionEvidence);
      expect(String(error)).not.toContain('injected sensitive failure');
    }
  });

  it('rejects invalid HMAC configuration at construction', () => {
    expect(() =>
      createSessionEvidenceGenerator({
        hmacKey: new Uint8Array(31),
        byteSource: createQueuedByteSource(sessionBytes, authenticatedCsrfBytes),
      }),
    ).toThrow('Session HMAC key must contain at least 32 bytes.');
  });
});

describe('issuance digest derivation', () => {
  it('derives purpose-branded full digests for canonical version 1 evidence', () => {
    expect(deriveSessionCredentialDigest(sessionEvidence, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: 'niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w',
    });
    expect(deriveAuthenticatedCsrfDigest(authenticatedCsrfEvidence, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: 'GrHYnJZK-462l5JUf0zH1n2fAbAiL1ObG3aHJ_FLqrE',
    });
  });

  it.each([
    `v2.${sessionEvidence.slice(3)}`,
    `v1.${sessionEvidence.slice(3)}=`,
    `v1.${sessionEvidence.slice(3, -1)}`,
  ])('rejects malformed or unsupported session evidence without repair: %s', (evidence) => {
    expect(deriveSessionCredentialDigest(evidence, hmacKey)).toBeUndefined();
  });

  it.each([
    `c2.${authenticatedCsrfEvidence.slice(3)}`,
    `c1.${authenticatedCsrfEvidence.slice(3)}=`,
    `c1.${authenticatedCsrfEvidence.slice(3, -1)}`,
    `p1.${authenticatedCsrfEvidence.slice(3)}`,
  ])('rejects malformed, unsupported, or cross-purpose CSRF evidence: %s', (evidence) => {
    expect(deriveAuthenticatedCsrfDigest(evidence, hmacKey)).toBeUndefined();
  });
});
