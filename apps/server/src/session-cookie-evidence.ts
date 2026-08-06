import type { SessionCookieName } from './session-http-configuration.js';

const findConfiguredCookieValues = (
  cookieHeader: string,
  cookieName: SessionCookieName,
): Array<string | undefined> =>
  cookieHeader.split(';').flatMap((cookiePair) => {
    const separator = cookiePair.indexOf('=');
    if (separator < 0) return cookiePair.trim() === cookieName ? [undefined] : [];
    if (cookiePair.slice(0, separator).trim() !== cookieName) return [];
    return [cookiePair.slice(separator + 1)];
  });

export const extractSessionCookieEvidence = (
  cookieHeader: string | undefined,
  parsedCookies: Readonly<Record<string, string | undefined>>,
  cookieName: SessionCookieName,
): string | undefined => {
  if (cookieHeader === undefined) {
    return undefined;
  }

  const rawValues = findConfiguredCookieValues(cookieHeader, cookieName);
  const parsedValue = parsedCookies[cookieName];
  return rawValues.length === 1 && rawValues[0] === parsedValue ? parsedValue : undefined;
};
