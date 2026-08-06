import { z } from 'zod';

export const successEnvelopeSchema = <Data extends z.ZodType, Meta extends z.ZodType>(
  data: Data,
  meta: Meta,
) =>
  z.object({
    data,
    meta,
  });

export const dataEnvelopeSchema = <Data extends z.ZodType>(data: Data) =>
  z.object({
    data,
  });

export type SuccessEnvelope<Data, Meta> = {
  data: Data;
  meta: Meta;
};

export type DataEnvelope<Data> = {
  data: Data;
};
