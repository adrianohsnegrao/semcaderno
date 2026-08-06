export type SessionCookieName = '__Host-sem-caderno-session' | 'sem-caderno-session';

export type SessionHttpConfiguration = Readonly<{
  cookieName: SessionCookieName;
  hmacKey: Uint8Array;
}>;

const canonicalKeyPattern = /^[A-Za-z0-9_-]{43}$/;

const invalidConfiguration = (): Error => new Error('Server session configuration is invalid.');

const decodeHmacKey = (encodedKey: string | undefined): Uint8Array => {
  if (encodedKey === undefined || !canonicalKeyPattern.test(encodedKey)) {
    throw invalidConfiguration();
  }

  const decodedKey = Buffer.from(encodedKey, 'base64url');
  if (decodedKey.byteLength !== 32 || decodedKey.toString('base64url') !== encodedKey) {
    throw invalidConfiguration();
  }

  return Uint8Array.from(decodedKey);
};

export const loadSessionHttpConfiguration = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SessionHttpConfiguration => {
  const profile = environment['SEM_CADERNO_SESSION_COOKIE_PROFILE'];
  const cookieName =
    profile === 'production'
      ? '__Host-sem-caderno-session'
      : profile === 'local-development'
        ? 'sem-caderno-session'
        : undefined;

  if (cookieName === undefined) {
    throw invalidConfiguration();
  }

  return Object.freeze({
    cookieName,
    hmacKey: decodeHmacKey(environment['SEM_CADERNO_SESSION_HMAC_KEY_V1_BASE64URL']),
  });
};
