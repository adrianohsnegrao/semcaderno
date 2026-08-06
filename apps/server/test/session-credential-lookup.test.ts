import { createHmac } from 'node:crypto';

import { deriveSessionLookupKey } from '../src/session-credential-lookup.js';

const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const canonicalEvidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

describe('session credential lookup derivation', () => {
  it('matches the fixed version 1 known-answer vector', () => {
    expect(deriveSessionLookupKey(canonicalEvidence, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: 'niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w',
    });
  });

  it('is deterministic and produces a different lookup for different credential bytes', () => {
    const changedEvidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh4';

    expect(deriveSessionLookupKey(canonicalEvidence, hmacKey)).toEqual(
      deriveSessionLookupKey(canonicalEvidence, hmacKey),
    );
    expect(deriveSessionLookupKey(changedEvidence, hmacKey)).toEqual({
      digestVersion: 1,
      digestBase64Url: 'UmpaWZzEt_aL6NRIovQ3khUPJ2zjYo8Uwd63-tbDEu0',
    });
  });

  it('locks the accepted domain separation into the known answer', () => {
    const credentialBytes = Buffer.from(canonicalEvidence.slice(3), 'base64url');
    const alternateDigest = createHmac('sha256', hmacKey)
      .update(Buffer.from('sem-caderno/session-lookup/alternate', 'utf8'))
      .update(Buffer.from([0]))
      .update(credentialBytes)
      .digest('base64url');

    expect(alternateDigest).not.toBe('niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w');
  });

  it.each([
    { label: 'empty input', evidence: '' },
    {
      label: 'unsupported version',
      evidence: 'v2.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
    },
    {
      label: 'short encoding',
      evidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh',
    },
    {
      label: 'padded encoding',
      evidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
    },
    {
      label: 'non-base64url alphabet',
      evidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh+',
    },
  ])('rejects $label without repair', ({ evidence }) => {
    expect(deriveSessionLookupKey(evidence, hmacKey)).toBeUndefined();
  });

  it('rejects an undersized HMAC key without exposing evidence or key material', () => {
    expect(() => deriveSessionLookupKey(canonicalEvidence, new Uint8Array(31))).toThrow(
      'Session HMAC key must contain at least 32 bytes.',
    );

    try {
      deriveSessionLookupKey(canonicalEvidence, new Uint8Array(31));
    } catch (error) {
      expect(String(error)).not.toContain(canonicalEvidence);
      expect(String(error)).not.toContain('0,0,0');
    }
  });
});
