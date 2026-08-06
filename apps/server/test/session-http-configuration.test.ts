import { loadSessionHttpConfiguration } from '../src/session-http-configuration.js';

const keyBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
const encodedKey = Buffer.from(keyBytes).toString('base64url');

const environmentFor = (profile: string | undefined, key: string | undefined) => ({
  SEM_CADERNO_SESSION_COOKIE_PROFILE: profile,
  SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL: key,
});

describe('session HTTP configuration', () => {
  it.each([
    { profile: 'production', cookieName: '__Host-sem-caderno-session' },
    { profile: 'local-development', cookieName: 'sem-caderno-session' },
  ] as const)('loads the fixed $profile cookie profile', ({ profile, cookieName }) => {
    const configuration = loadSessionHttpConfiguration(environmentFor(profile, encodedKey));

    expect(configuration.cookieName).toBe(cookieName);
    expect(configuration.hmacKey).toEqual(keyBytes);
    expect(configuration.hmacKey).not.toBe(keyBytes);
  });

  it.each([undefined, '', 'staging', 'Production'])(
    'rejects invalid cookie profile %s',
    (profile) => {
      expect(() => loadSessionHttpConfiguration(environmentFor(profile, encodedKey))).toThrow(
        'Server session configuration is invalid.',
      );
    },
  );

  it.each([
    undefined,
    '',
    encodedKey.slice(0, -1),
    `${encodedKey}=`,
    `${encodedKey.slice(0, -1)}+`,
    `${encodedKey.slice(0, -1)}B`,
    `${encodedKey}A`,
  ])('rejects missing or non-canonical HMAC configuration', (candidate) => {
    try {
      loadSessionHttpConfiguration(environmentFor('production', candidate));
      expect.fail('Expected invalid server session configuration to fail.');
    } catch (error) {
      expect(error).toEqual(new Error('Server session configuration is invalid.'));
      if (candidate !== undefined && candidate !== '') {
        expect(String(error)).not.toContain(candidate);
      }
    }
  });
});
