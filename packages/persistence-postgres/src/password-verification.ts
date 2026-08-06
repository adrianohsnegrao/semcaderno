import type {
  PasswordVerificationPort,
  PasswordVerificationResult,
  VerifyPasswordInput,
} from '@sem-caderno/application';
import { verify as verifyArgon2 } from 'argon2';
import type { Pool } from 'pg';

type PasswordVerificationRow = Readonly<{
  userId: unknown;
  emailVerifiedAt: unknown;
  disabledAt: unknown;
  passwordVerifier: unknown;
}>;

type PasswordHashVerifier = (verifier: string, password: string) => Promise<boolean>;

const dummyPasswordVerifier =
  '$argon2id$v=19$m=19456,p=1,t=2$c2VtLWNhZGVybm8tdjEhIQ$r2Troww4JLUnNo/ejnOJQAKcLSv3IGQ6X7FpAuC6Rrk';
const phcValuePattern = /^[A-Za-z0-9+/]+$/;
const minimumMemoryCost = 19_456;
const minimumTimeCost = 2;
const minimumParallelism = 1;

const decodePhcValue = (value: string): Buffer => {
  if (!phcValuePattern.test(value)) {
    throw new Error('Password credential persistence row is invalid.');
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64').replace(/=+$/, '') !== value) {
    throw new Error('Password credential persistence row is invalid.');
  }

  return decoded;
};

const parseParameters = (value: string): ReadonlyMap<string, number> => {
  const entries = value.split(',').map((entry) => entry.split('='));
  if (
    entries.length !== 3 ||
    entries.some(
      (entry) =>
        entry.length !== 2 ||
        entry[0] === undefined ||
        entry[1] === undefined ||
        !/^[mtp]$/.test(entry[0]) ||
        !/^[1-9][0-9]*$/.test(entry[1]),
    )
  ) {
    throw new Error('Password credential persistence row is invalid.');
  }

  const parameters = new Map(entries.map(([name, number]) => [name!, Number(number)]));
  if (parameters.size !== 3) {
    throw new Error('Password credential persistence row is invalid.');
  }

  return parameters;
};

const assertAcceptedPasswordVerifier = (value: string): void => {
  const sections = value.split('$');
  if (
    sections.length !== 6 ||
    sections[0] !== '' ||
    sections[1] !== 'argon2id' ||
    sections[2] !== 'v=19' ||
    sections[3] === undefined ||
    sections[4] === undefined ||
    sections[5] === undefined
  ) {
    throw new Error('Password credential persistence row is invalid.');
  }

  const parameters = parseParameters(sections[3]);
  if (
    (parameters.get('m') ?? 0) < minimumMemoryCost ||
    (parameters.get('t') ?? 0) < minimumTimeCost ||
    (parameters.get('p') ?? 0) < minimumParallelism ||
    decodePhcValue(sections[4]).byteLength < 16 ||
    decodePhcValue(sections[5]).byteLength < 32
  ) {
    throw new Error('Password credential persistence row is invalid.');
  }
};

const mapRow = (
  row: PasswordVerificationRow,
): Readonly<{
  userId: string;
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
  passwordVerifier: string | null;
}> => {
  if (
    typeof row.userId !== 'string' ||
    (row.emailVerifiedAt !== null && !(row.emailVerifiedAt instanceof Date)) ||
    (row.disabledAt !== null && !(row.disabledAt instanceof Date)) ||
    (row.passwordVerifier !== null && typeof row.passwordVerifier !== 'string')
  ) {
    throw new Error('Password credential persistence row is invalid.');
  }

  return {
    userId: row.userId,
    emailVerifiedAt: row.emailVerifiedAt,
    disabledAt: row.disabledAt,
    passwordVerifier: row.passwordVerifier,
  };
};

export class PostgresPasswordVerificationAdapter implements PasswordVerificationPort {
  constructor(
    private readonly pool: Pool,
    private readonly verifyPassword: PasswordHashVerifier = verifyArgon2,
  ) {}

  async verify(input: VerifyPasswordInput): Promise<PasswordVerificationResult> {
    let rows: PasswordVerificationRow[];
    try {
      const result = await this.pool.query<PasswordVerificationRow>(
        `SELECT
           verified_user.id AS "userId",
           verified_user.email_verified_at AS "emailVerifiedAt",
           verified_user.disabled_at AS "disabledAt",
           credential.password_verifier AS "passwordVerifier"
         FROM sem_caderno.users AS verified_user
         LEFT JOIN sem_caderno.user_password_credentials AS credential
           ON credential.user_id = verified_user.id
         WHERE verified_user.email_normalized = $1
         LIMIT 2`,
        [input.normalizedEmail],
      );
      rows = result.rows;
    } catch {
      throw new Error('Password verification persistence failed.');
    }

    if (rows.length > 1) {
      throw new Error('Password credential persistence row is invalid.');
    }

    const persisted = rows[0] === undefined ? undefined : mapRow(rows[0]);
    const usableCredential =
      persisted !== undefined &&
      persisted.disabledAt === null &&
      persisted.passwordVerifier !== null;
    const passwordVerifier = usableCredential ? persisted.passwordVerifier : dummyPasswordVerifier;

    assertAcceptedPasswordVerifier(passwordVerifier);

    let matches: boolean;
    try {
      matches = await this.verifyPassword(passwordVerifier, input.normalizedPassword);
    } catch {
      throw new Error('Password verification failed.');
    }

    if (!usableCredential || !matches) {
      return { outcome: 'invalid' };
    }

    return persisted.emailVerifiedAt === null
      ? { outcome: 'emailVerificationRequired', userId: persisted.userId }
      : { outcome: 'verified', userId: persisted.userId };
  }
}
