import { z } from 'zod';

export const contractLimits = {
  correlationId: 128,
  cursor: 2_048,
  errorDetail: 1_000,
  errorTitle: 200,
  fieldPath: 256,
  idempotencyKey: 200,
  identifier: 200,
  operationCode: 100,
  problemType: 2_048,
  violations: 50,
} as const;

export const apiVersionSchema = z.literal('v1');
export type ApiVersion = z.infer<typeof apiVersionSchema>;

export const apiNamespace = '/api/v1' as const;

const boundedOpaqueString = (maximum: number) =>
  z
    .string()
    .min(1)
    .max(maximum)
    .refine((value) => value.trim() === value, 'Leading or trailing whitespace is not allowed.');

export const opaqueIdentifierSchema = boundedOpaqueString(contractLimits.identifier);
export type OpaqueIdentifier = z.infer<typeof opaqueIdentifierSchema>;

export const correlationIdSchema = boundedOpaqueString(contractLimits.correlationId);
export type CorrelationId = z.infer<typeof correlationIdSchema>;

export const cursorSchema = boundedOpaqueString(contractLimits.cursor);
export type Cursor = z.infer<typeof cursorSchema>;

export const idempotencyKeySchema = boundedOpaqueString(contractLimits.idempotencyKey).regex(
  /^[\x21-\x7e]+$/,
  'The idempotency key must contain visible ASCII characters only.',
);
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;

export const operationCodeSchema = z
  .string()
  .min(1)
  .max(contractLimits.operationCode)
  .regex(/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/);
export type OperationCode = z.infer<typeof operationCodeSchema>;

const maximumMinorUnits = 9_223_372_036_854_775_807n;
const minorUnitPattern = /^(?:0|[1-9][0-9]*)$/;

export const minorUnitAmountSchema = z
  .string()
  .regex(minorUnitPattern)
  .refine(
    (value) => minorUnitPattern.test(value) && BigInt(value) <= maximumMinorUnits,
    'Amount exceeds the v1 limit.',
  );
export type MinorUnitAmount = z.infer<typeof minorUnitAmountSchema>;

export const positiveMinorUnitAmountSchema = minorUnitAmountSchema.refine(
  (value) => value !== '0',
  'Amount must be positive.',
);
export type PositiveMinorUnitAmount = z.infer<typeof positiveMinorUnitAmountSchema>;

export const currencyCodeSchema = z.literal('BRL');
export type CurrencyCode = z.infer<typeof currencyCodeSchema>;

export const moneySchema = z.strictObject({
  amountMinor: minorUnitAmountSchema,
  currency: currencyCodeSchema,
});
export type Money = z.infer<typeof moneySchema>;

export const positiveMoneySchema = z.strictObject({
  amountMinor: positiveMinorUnitAmountSchema,
  currency: currencyCodeSchema,
});
export type PositiveMoney = z.infer<typeof positiveMoneySchema>;

export const wholeUnitQuantitySchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export type WholeUnitQuantity = z.infer<typeof wholeUnitQuantitySchema>;

const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const isCalendarDate = (value: string) => {
  const match = localDatePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
};

export const businessLocalDateSchema = z.string().regex(localDatePattern).refine(isCalendarDate);
export type BusinessLocalDate = z.infer<typeof businessLocalDateSchema>;

const utcInstantPattern =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?Z$/;

export const utcInstantSchema = z
  .string()
  .regex(utcInstantPattern)
  .refine((value) => isCalendarDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value)));
export type UtcInstant = z.infer<typeof utcInstantSchema>;

export const timeZoneIdentifierSchema = z
  .string()
  .min(3)
  .max(255)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+$/);
export type TimeZoneIdentifier = z.infer<typeof timeZoneIdentifierSchema>;

export const entityTagSchema = z
  .string()
  .min(3)
  .max(256)
  .regex(/^"[\x21\x23-\x7e]+"$/);
export type EntityTag = z.infer<typeof entityTagSchema>;

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const isJsonValue = (value: unknown, activeObjects = new Set<object>()): value is JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (activeObjects.has(value)) return false;

  activeObjects.add(value);
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, activeObjects))
    : (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null) &&
      Object.values(value).every((item) => isJsonValue(item, activeObjects));
  activeObjects.delete(value);
  return valid;
};

export const jsonValueSchema = z.custom<JsonValue>((value) => isJsonValue(value));
