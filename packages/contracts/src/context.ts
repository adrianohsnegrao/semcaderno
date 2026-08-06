import { z } from 'zod';

import { opaqueIdentifierSchema, utcInstantSchema } from './scalars.js';

export const selectedBusinessContextSchema = z.strictObject({
  businessId: opaqueIdentifierSchema,
});
export type SelectedBusinessContext = z.infer<typeof selectedBusinessContextSchema>;

const anonymousSessionContextSchema = z.object({
  state: z.literal('anonymous'),
});

const authenticatedSessionContextSchema = z.object({
  state: z.literal('authenticated'),
  userId: opaqueIdentifierSchema,
  expiresAt: utcInstantSchema,
  selectedBusiness: selectedBusinessContextSchema.optional(),
});

export const sessionContextSchema = z.discriminatedUnion('state', [
  anonymousSessionContextSchema,
  authenticatedSessionContextSchema,
]);
export type SessionContext = z.infer<typeof sessionContextSchema>;
