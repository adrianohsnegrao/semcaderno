declare const normalizedEmailBrand: unique symbol;

export type NormalizedEmail = string & {
  readonly [normalizedEmailBrand]: true;
};

const emailLocalAtomPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+$/;
const emailDomainLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const isAcceptedPrimaryEmail = (value: string): boolean => {
  if (value.length < 3 || value.length > 254 || !/^[\x00-\x7f]+$/.test(value)) return false;

  const separator = value.indexOf('@');
  if (separator <= 0 || separator !== value.lastIndexOf('@') || separator === value.length - 1) {
    return false;
  }

  const localPart = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !localPart.split('.').every((atom) => emailLocalAtomPattern.test(atom)) ||
    !domain.split('.').every((label) => emailDomainLabelPattern.test(label))
  ) {
    return false;
  }

  return true;
};

export const normalizePrimaryEmail = (value: string): NormalizedEmail => {
  if (!isAcceptedPrimaryEmail(value)) {
    throw new TypeError('Primary email does not match the accepted ASCII mailbox profile.');
  }

  return value.normalize('NFC').toLowerCase() as NormalizedEmail;
};

export type VerifyPasswordInput = Readonly<{
  normalizedEmail: NormalizedEmail;
  normalizedPassword: string;
}>;

export type PasswordVerificationResult =
  | Readonly<{ outcome: 'verified'; userId: string }>
  | Readonly<{ outcome: 'emailVerificationRequired'; userId: string }>
  | Readonly<{ outcome: 'invalid' }>;

export interface PasswordVerificationPort {
  verify(input: VerifyPasswordInput): Promise<PasswordVerificationResult>;
}

declare const sessionCredentialDigestBrand: unique symbol;
declare const preSessionCsrfDigestBrand: unique symbol;
declare const authenticatedCsrfDigestBrand: unique symbol;

export type SessionCredentialDigest = Readonly<{
  digestVersion: 1;
  digestBase64Url: string;
  readonly [sessionCredentialDigestBrand]: true;
}>;

export type PreSessionCsrfDigest = Readonly<{
  digestVersion: 1;
  digestBase64Url: string;
  readonly [preSessionCsrfDigestBrand]: true;
}>;

export type AuthenticatedCsrfDigest = Readonly<{
  digestVersion: 1;
  digestBase64Url: string;
  readonly [authenticatedCsrfDigestBrand]: true;
}>;

export type IssueSessionInput = Readonly<{
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  sessionCredentialDigest: SessionCredentialDigest;
  preSessionCsrfDigest: PreSessionCsrfDigest;
  authenticatedCsrfDigest: AuthenticatedCsrfDigest;
  priorSessionCredentialDigest?: SessionCredentialDigest;
}>;

export type IssuedSession = Readonly<{
  userId: string;
  expiresAt: Date;
}>;

export interface SessionIssuanceTransactionPort {
  issue(input: IssueSessionInput): Promise<IssuedSession>;
}
