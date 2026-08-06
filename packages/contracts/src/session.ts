import type { z } from 'zod';

import { dataEnvelopeSchema } from './envelopes.js';
import { sessionContextSchema } from './context.js';

export const currentSessionInspectionResponseSchema = dataEnvelopeSchema(sessionContextSchema);
export type CurrentSessionInspectionResponse = z.infer<
  typeof currentSessionInspectionResponseSchema
>;
