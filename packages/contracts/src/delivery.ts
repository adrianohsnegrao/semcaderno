import { z } from 'zod';

export const paymentRequestStatusSchema = z.enum([
  'prepared',
  'deliveryPending',
  'delivered',
  'deliveryFailed',
  'cancelled',
  'expired',
]);
export type PaymentRequestStatus = z.infer<typeof paymentRequestStatusSchema>;

export const paymentRequestFinancialStateSchema = z.literal('paymentNotRecorded');
export type PaymentRequestFinancialState = z.infer<typeof paymentRequestFinancialStateSchema>;

export const paymentRequestStatusMetadataSchema = z.object({
  status: paymentRequestStatusSchema,
  financialState: paymentRequestFinancialStateSchema,
});
export type PaymentRequestStatusMetadata = z.infer<typeof paymentRequestStatusMetadataSchema>;
