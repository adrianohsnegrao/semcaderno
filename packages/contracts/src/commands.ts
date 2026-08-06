import { z } from 'zod';

import { problemCodeSchema } from './errors.js';
import { correlationIdSchema, entityTagSchema, operationCodeSchema } from './scalars.js';

const committedCommandMetadataSchema = z.object({
  outcome: z.literal('committed'),
  replayed: z.boolean(),
  retryAllowed: z.literal(false),
});

const unknownCommandMetadataSchema = z.object({
  outcome: z.literal('unknown'),
  replayed: z.literal(false),
  retryAllowed: z.literal(false),
  recoveryRequired: z.literal(true),
  code: z.literal('COMMAND_OUTCOME_UNKNOWN'),
  correlationId: correlationIdSchema,
});

export const commandResultMetadataSchema = z.discriminatedUnion('outcome', [
  committedCommandMetadataSchema,
  unknownCommandMetadataSchema,
]);
export type CommandResultMetadata = z.infer<typeof commandResultMetadataSchema>;

export const recoveryRequestSchema = z.strictObject({
  operationCode: operationCodeSchema,
});
export type RecoveryRequest = z.infer<typeof recoveryRequestSchema>;

const committedRecoveryMetadataSchema = z.object({
  outcome: z.literal('committed'),
  retryAllowed: z.literal(false),
  recovered: z.literal(true),
});

const rejectedRecoveryMetadataSchema = z.object({
  outcome: z.literal('rejected'),
  retryAllowed: z.literal(false),
  recovered: z.literal(true),
  code: problemCodeSchema,
});

const notCommittedRecoveryMetadataSchema = z.object({
  outcome: z.literal('notCommitted'),
  retryAllowed: z.literal(true),
  recovered: z.literal(true),
});

const unknownRecoveryMetadataSchema = z.object({
  outcome: z.literal('unknown'),
  retryAllowed: z.literal(false),
  recovered: z.literal(false),
  recoveryRequired: z.literal(true),
  code: z.literal('COMMAND_OUTCOME_UNKNOWN'),
  correlationId: correlationIdSchema,
});

export const recoveryResultMetadataSchema = z.discriminatedUnion('outcome', [
  committedRecoveryMetadataSchema,
  rejectedRecoveryMetadataSchema,
  notCommittedRecoveryMetadataSchema,
  unknownRecoveryMetadataSchema,
]);
export type RecoveryResultMetadata = z.infer<typeof recoveryResultMetadataSchema>;

export const conditionalRequestSchema = z.strictObject({
  ifMatch: entityTagSchema,
});
export type ConditionalRequest = z.infer<typeof conditionalRequestSchema>;

export const concurrencyConflictMetadataSchema = z.object({
  freshStateRequired: z.literal(true),
});
export type ConcurrencyConflictMetadata = z.infer<typeof concurrencyConflictMetadataSchema>;
