import { z } from 'zod';

import { dataEnvelopeSchema } from './envelopes.js';
import { opaqueIdentifierSchema, utcInstantSchema } from './scalars.js';

export const authenticationContractLimits = {
  emailBytesMinimum: 3,
  emailBytesMaximum: 254,
  passwordScalarValuesMinimum: 1,
  passwordScalarValuesMaximum: 128,
  passwordUtf8BytesMaximum: 512,
} as const;

const emailLocalAtomPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+$/;
const emailDomainLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

const isAcceptedPrimaryEmail = (value: string): boolean => {
  if (!/^[\x00-\x7f]+$/.test(value)) return false;

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
    !localPart.split('.').every((atom) => emailLocalAtomPattern.test(atom))
  ) {
    return false;
  }

  return domain.split('.').every((label) => emailDomainLabelPattern.test(label));
};

const primaryEmailSchema = z
  .string()
  .min(authenticationContractLimits.emailBytesMinimum)
  .max(authenticationContractLimits.emailBytesMaximum)
  .refine(isAcceptedPrimaryEmail, 'Email does not match the accepted ASCII mailbox profile.');

const isUnicodeScalarString = (value: string): boolean =>
  Array.from(value).every((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 0xd800 || codePoint > 0xdfff);
  });

const normalizedSignInPasswordSchema = z.string().transform((value) => value.normalize('NFC'));

const signInPasswordSchema = normalizedSignInPasswordSchema.pipe(
  z.string().superRefine((value, context) => {
    const scalarValues = Array.from(value);
    if (
      !isUnicodeScalarString(value) ||
      scalarValues.length < authenticationContractLimits.passwordScalarValuesMinimum ||
      scalarValues.length > authenticationContractLimits.passwordScalarValuesMaximum
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Password does not match the accepted Unicode scalar-value limits.',
      });
    }

    if (
      new TextEncoder().encode(value).byteLength >
      authenticationContractLimits.passwordUtf8BytesMaximum
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Password exceeds the accepted UTF-8 byte limit.',
      });
    }
  }),
);

const canonicalEvidencePayloadPattern = /^[A-Za-z0-9_-]{42}[AQgw]$/;
const preSessionCsrfTokenSchema = z
  .string()
  .regex(/^p1\./)
  .refine(
    (value) => canonicalEvidencePayloadPattern.test(value.slice(3)),
    'Pre-session CSRF evidence is not canonical.',
  );
const authenticatedCsrfTokenSchema = z
  .string()
  .regex(/^c1\./)
  .refine(
    (value) => canonicalEvidencePayloadPattern.test(value.slice(3)),
    'Authenticated CSRF evidence is not canonical.',
  );

export const sessionBootstrapResponseSchema = dataEnvelopeSchema(
  z.object({
    csrfToken: preSessionCsrfTokenSchema,
    expiresAt: utcInstantSchema,
  }),
);
export type SessionBootstrapResponse = z.infer<typeof sessionBootstrapResponseSchema>;

export const signInRequestSchema = z.strictObject({
  email: primaryEmailSchema,
  password: signInPasswordSchema,
});
export type SignInRequest = z.infer<typeof signInRequestSchema>;

export const signInResponseSchema = dataEnvelopeSchema(
  z.object({
    state: z.literal('authenticated'),
    userId: opaqueIdentifierSchema,
    expiresAt: utcInstantSchema,
    csrfToken: authenticatedCsrfTokenSchema,
  }),
);
export type SignInResponse = z.infer<typeof signInResponseSchema>;
