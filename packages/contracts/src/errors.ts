import { z } from 'zod';

import { contractLimits, correlationIdSchema } from './scalars.js';

export const applicationErrorCodes = [
  'AUTHENTICATION_FAILED',
  'AUTHENTICATION_REQUIRED',
  'SESSION_INVALID',
  'EMAIL_VERIFICATION_REQUIRED',
  'BUSINESS_CONTEXT_REQUIRED',
  'BUSINESS_UNAVAILABLE',
  'MEMBERSHIP_INACTIVE',
  'CAPABILITY_DENIED',
  'RESOURCE_NOT_FOUND',
  'VALIDATION_FAILED',
  'STATE_CONFLICT',
  'CONCURRENT_MODIFICATION',
  'IDEMPOTENCY_INTENT_MISMATCH',
  'OVERPAYMENT_REJECTED',
  'CUSTOMER_REQUIRED_FOR_DEBT',
  'INVALID_ALLOCATION_CONTEXT',
  'LAST_ACTIVE_OWNER_REQUIRED',
  'INVITATION_INVALID',
  'INVITATION_EXPIRED',
  'INVITATION_CANCELLED',
  'INVITATION_CONSUMED',
  'PROJECTION_UNAVAILABLE',
  'INTERNAL_FAILURE',
] as const;

export const transportErrorCodes = [
  'MALFORMED_REQUEST',
  'UNSUPPORTED_MEDIA_TYPE',
  'CSRF_REJECTED',
  'PRECONDITION_REQUIRED',
  'RATE_LIMITED',
] as const;

export const successStatusCodes = [
  'COMMAND_REPLAYED',
  'COMMAND_OUTCOME_UNKNOWN',
  'PROJECTION_STALE',
  'EXTERNAL_DELIVERY_PENDING',
  'EXTERNAL_DELIVERY_FAILED',
] as const;

export const problemCodeSchema = z.enum([...applicationErrorCodes, ...transportErrorCodes]);
export type ProblemCode = z.infer<typeof problemCodeSchema>;

export const transportCodeSchema = z.enum([
  ...applicationErrorCodes,
  ...transportErrorCodes,
  ...successStatusCodes,
]);
export type TransportCode = z.infer<typeof transportCodeSchema>;

export const retryClassificationSchema = z.enum([
  'never',
  'afterCorrection',
  'afterAuthentication',
  'afterRefresh',
  'afterDelay',
  'recoverOutcome',
]);
export type RetryClassification = z.infer<typeof retryClassificationSchema>;

export const commitStateSchema = z.enum([
  'notCommitted',
  'unknown',
  'priorCommitted',
  'notApplicable',
]);
export type CommitState = z.infer<typeof commitStateSchema>;

export const fieldViolationSchema = z.object({
  path: z.string().min(1).max(contractLimits.fieldPath),
  code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/),
  messageKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*$/),
});
export type FieldViolation = z.infer<typeof fieldViolationSchema>;

const problemHttpStatusByCode: Readonly<Record<ProblemCode, number | readonly number[]>> = {
  AUTHENTICATION_FAILED: 401,
  AUTHENTICATION_REQUIRED: 401,
  SESSION_INVALID: 401,
  EMAIL_VERIFICATION_REQUIRED: 403,
  BUSINESS_CONTEXT_REQUIRED: 400,
  BUSINESS_UNAVAILABLE: 403,
  MEMBERSHIP_INACTIVE: 403,
  CAPABILITY_DENIED: 403,
  RESOURCE_NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  STATE_CONFLICT: 409,
  CONCURRENT_MODIFICATION: [409, 412],
  IDEMPOTENCY_INTENT_MISMATCH: 409,
  OVERPAYMENT_REJECTED: 409,
  CUSTOMER_REQUIRED_FOR_DEBT: 422,
  INVALID_ALLOCATION_CONTEXT: 409,
  LAST_ACTIVE_OWNER_REQUIRED: 409,
  INVITATION_INVALID: 404,
  INVITATION_EXPIRED: 409,
  INVITATION_CANCELLED: 409,
  INVITATION_CONSUMED: 409,
  PROJECTION_UNAVAILABLE: 503,
  INTERNAL_FAILURE: 500,
  MALFORMED_REQUEST: 400,
  UNSUPPORTED_MEDIA_TYPE: 415,
  CSRF_REJECTED: 403,
  PRECONDITION_REQUIRED: 428,
  RATE_LIMITED: 429,
};

export const problemDetailsSchema = z
  .object({
    type: z.url().max(contractLimits.problemType),
    title: z.string().min(1).max(contractLimits.errorTitle),
    status: z.number().int().min(400).max(599),
    code: problemCodeSchema,
    detail: z.string().min(1).max(contractLimits.errorDetail),
    correlationId: correlationIdSchema,
    retry: retryClassificationSchema,
    commitState: commitStateSchema,
    freshStateRequired: z.boolean(),
    violations: z.array(fieldViolationSchema).min(1).max(contractLimits.violations).optional(),
  })
  .superRefine((problem, context) => {
    const expected = problemHttpStatusByCode[problem.code];
    const matches = Array.isArray(expected)
      ? expected.includes(problem.status)
      : problem.status === expected;
    if (!matches) {
      context.addIssue({
        code: 'custom',
        path: ['status'],
        message: `Status does not match ${problem.code}.`,
      });
    }
  });
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
