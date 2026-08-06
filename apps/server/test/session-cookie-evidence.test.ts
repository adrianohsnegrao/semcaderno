import { extractSessionCookieEvidence } from '../src/session-cookie-evidence.js';

const cookieName = 'sem-caderno-session';
const evidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';

describe('strict session cookie evidence extraction', () => {
  it('returns the one parsed value only when it exactly matches the raw value', () => {
    expect(
      extractSessionCookieEvidence(
        `unrelated=value; ${cookieName}=${evidence}`,
        { [cookieName]: evidence },
        cookieName,
      ),
    ).toBe(evidence);
  });

  it.each([
    {
      label: 'missing header',
      header: undefined,
      parsed: {},
    },
    {
      label: 'missing configured cookie',
      header: 'unrelated=value',
      parsed: { unrelated: 'value' },
    },
    {
      label: 'duplicate configured cookie',
      header: `${cookieName}=${evidence}; ${cookieName}=${evidence}`,
      parsed: { [cookieName]: evidence },
    },
    {
      label: 'malformed configured occurrence before a valid cookie',
      header: `${cookieName}; ${cookieName}=${evidence}`,
      parsed: { [cookieName]: evidence },
    },
    {
      label: 'parser-trimmed leading whitespace',
      header: `${cookieName}= ${evidence}`,
      parsed: { [cookieName]: evidence },
    },
    {
      label: 'parser-trimmed trailing whitespace',
      header: `${cookieName}=${evidence} `,
      parsed: { [cookieName]: evidence },
    },
    {
      label: 'missing parsed value',
      header: `${cookieName}=${evidence}`,
      parsed: {},
    },
  ])('rejects $label', ({ header, parsed }) => {
    expect(extractSessionCookieEvidence(header, parsed, cookieName)).toBeUndefined();
  });
});
