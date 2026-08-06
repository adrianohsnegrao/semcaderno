import { z } from 'zod';

import {
  cursorSchema,
  entityTagSchema,
  timeZoneIdentifierSchema,
  utcInstantSchema,
} from './scalars.js';

export const pageRequestSchema = z.strictObject({
  limit: z.number().int().min(1).max(100),
  after: cursorSchema.optional(),
});
export type PageRequest = z.infer<typeof pageRequestSchema>;

const finalPageMetadataSchema = z.object({
  hasMore: z.literal(false),
});

const continuingPageMetadataSchema = z.object({
  hasMore: z.literal(true),
  nextCursor: cursorSchema,
});

export const pageMetadataSchema = z.discriminatedUnion('hasMore', [
  finalPageMetadataSchema,
  continuingPageMetadataSchema,
]);
export type PageMetadata = z.infer<typeof pageMetadataSchema>;

export const canonicalSourceMetadataSchema = z.object({
  source: z.literal('canonical'),
  etag: entityTagSchema.optional(),
});
export type CanonicalSourceMetadata = z.infer<typeof canonicalSourceMetadataSchema>;

const projectionBase = {
  source: z.literal('projection'),
  generatedAt: utcInstantSchema,
  asOf: utcInstantSchema,
  timeZone: timeZoneIdentifierSchema,
};

export const projectionSourceMetadataSchema = z.discriminatedUnion('freshness', [
  z.object({ ...projectionBase, freshness: z.literal('current') }),
  z.object({ ...projectionBase, freshness: z.literal('stale') }),
  z.object({ ...projectionBase, freshness: z.literal('unavailable') }),
]);
export type ProjectionSourceMetadata = z.infer<typeof projectionSourceMetadataSchema>;

export const querySourceMetadataSchema = z.discriminatedUnion('source', [
  canonicalSourceMetadataSchema,
  projectionSourceMetadataSchema,
]);
export type QuerySourceMetadata = z.infer<typeof querySourceMetadataSchema>;
