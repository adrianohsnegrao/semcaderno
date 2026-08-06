import { z } from 'zod';

import {
  apiVersionSchema,
  businessLocalDateSchema,
  commandResultMetadataSchema,
  conditionalRequestSchema,
  contractLimits,
  dataEnvelopeSchema,
  idempotencyKeySchema,
  jsonValueSchema,
  minorUnitAmountSchema,
  moneySchema,
  opaqueIdentifierSchema,
  pageMetadataSchema,
  pageRequestSchema,
  paymentRequestStatusMetadataSchema,
  problemDetailsSchema,
  projectionSourceMetadataSchema,
  recoveryRequestSchema,
  recoveryResultMetadataSchema,
  selectedBusinessContextSchema,
  sessionContextSchema,
  successEnvelopeSchema,
  timeZoneIdentifierSchema,
  transportCodeSchema,
  utcInstantSchema,
  wholeUnitQuantitySchema,
  type CommandResultMetadata,
  type SessionContext,
} from '../src/index.js';

const syntheticIds = {
  business: 'business-synthetic-001',
  correlation: 'correlation-synthetic-001',
  user: 'user-synthetic-001',
} as const;

const baseProblem = {
  type: 'https://errors.invalid/validation-failed',
  title: 'Validation failed',
  status: 422,
  code: 'VALIDATION_FAILED',
  detail: 'Review the indicated fields.',
  correlationId: syntheticIds.correlation,
  retry: 'afterCorrection',
  commitState: 'notCommitted',
  freshStateRequired: false,
} as const;

describe('JSON-safe scalar contracts', () => {
  it('accepts the exact v1 marker and rejects other versions', () => {
    expect(apiVersionSchema.parse('v1')).toBe('v1');
    expect(apiVersionSchema.safeParse('v2').success).toBe(false);
  });

  it.each([
    undefined,
    1n,
    new Date('2026-08-01T14:30:00Z'),
    new Map(),
    new Set(),
    () => undefined,
    Symbol('synthetic'),
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('rejects non-JSON runtime value %#', (value) => {
    expect(jsonValueSchema.safeParse(value).success).toBe(false);
  });

  it('rejects cyclic values and accepts nested JSON', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(jsonValueSchema.safeParse(cyclic).success).toBe(false);
    expect(jsonValueSchema.parse({ active: true, values: [null, 'synthetic', 3] })).toEqual({
      active: true,
      values: [null, 'synthetic', 3],
    });
  });

  it('enforces identifier and idempotency-key boundaries without coercion', () => {
    expect(opaqueIdentifierSchema.parse(syntheticIds.business)).toBe(syntheticIds.business);
    expect(opaqueIdentifierSchema.safeParse(` ${syntheticIds.business}`).success).toBe(false);
    expect(opaqueIdentifierSchema.safeParse(7).success).toBe(false);
    expect(idempotencyKeySchema.parse('intent.synthetic-001')).toBe('intent.synthetic-001');
    expect(idempotencyKeySchema.safeParse('line\nbreak').success).toBe(false);
    expect(
      idempotencyKeySchema.safeParse('x'.repeat(contractLimits.idempotencyKey + 1)).success,
    ).toBe(false);
  });

  it('enforces UTC instants, local dates, and time-zone identifiers', () => {
    expect(utcInstantSchema.parse('2026-08-01T14:30:00Z')).toBe('2026-08-01T14:30:00Z');
    expect(utcInstantSchema.safeParse('2026-08-01T10:30:00-04:00').success).toBe(false);
    expect(utcInstantSchema.safeParse('2026-02-30T14:30:00Z').success).toBe(false);
    expect(businessLocalDateSchema.parse('2026-08-01')).toBe('2026-08-01');
    expect(businessLocalDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(timeZoneIdentifierSchema.parse('America/Manaus')).toBe('America/Manaus');
    expect(timeZoneIdentifierSchema.safeParse('-04:00').success).toBe(false);
  });

  it('enforces integer minor units and whole-unit quantities', () => {
    expect(minorUnitAmountSchema.parse('0')).toBe('0');
    expect(minorUnitAmountSchema.parse('9223372036854775807')).toBe('9223372036854775807');
    for (const invalid of ['-1', '01', '1.50', '9223372036854775808']) {
      expect(minorUnitAmountSchema.safeParse(invalid).success).toBe(false);
    }
    expect(moneySchema.parse({ amountMinor: '2500', currency: 'BRL' })).toEqual({
      amountMinor: '2500',
      currency: 'BRL',
    });
    expect(moneySchema.safeParse({ amountMinor: 2500, currency: 'BRL' }).success).toBe(false);
    expect(moneySchema.safeParse({ amountMinor: '2500', currency: 'USD' }).success).toBe(false);
    expect(wholeUnitQuantitySchema.parse(1)).toBe(1);
    expect(wholeUnitQuantitySchema.safeParse(1.5).success).toBe(false);
    expect(wholeUnitQuantitySchema.safeParse('1').success).toBe(false);
  });
});

describe('session and selected Business context', () => {
  it('keeps selected Business context structurally separate from session identity', () => {
    const selected = selectedBusinessContextSchema.parse({ businessId: syntheticIds.business });
    expect(selected).toEqual({ businessId: syntheticIds.business });

    const session = sessionContextSchema.parse({
      state: 'authenticated',
      userId: syntheticIds.user,
      expiresAt: '2026-08-01T15:00:00Z',
      selectedBusiness: selected,
    });
    expect(session.state).toBe('authenticated');
  });

  it('ignores additive response fields but rejects strict request extras', () => {
    expect(
      sessionContextSchema.safeParse({ state: 'anonymous', userId: syntheticIds.user }).success,
    ).toBe(true);
    expect(
      selectedBusinessContextSchema.safeParse({
        businessId: syntheticIds.business,
        grantsAccess: true,
      }).success,
    ).toBe(false);
  });
});

describe('stable transport errors', () => {
  it('accepts the accepted Problem Details shape and strips additive response fields', () => {
    const result = problemDetailsSchema.parse({
      ...baseProblem,
      violations: [
        { path: 'items.0.quantity', code: 'INVALID_VALUE', messageKey: 'field.invalid' },
      ],
      futureSafeMetadata: 'ignored-by-v1-consumer',
    });
    expect(result.code).toBe('VALIDATION_FAILED');
    expect('futureSafeMetadata' in result).toBe(false);
  });

  it('rejects unknown codes and status/code mismatches', () => {
    expect(transportCodeSchema.safeParse('UNACCEPTED_ERROR').success).toBe(false);
    expect(problemDetailsSchema.safeParse({ ...baseProblem, status: 409 }).success).toBe(false);
  });

  it('requires valid field violations when supplied', () => {
    expect(problemDetailsSchema.safeParse({ ...baseProblem, violations: [] }).success).toBe(false);
    expect(
      problemDetailsSchema.safeParse({
        ...baseProblem,
        violations: [{ path: '', code: 'INVALID_VALUE', messageKey: 'field.invalid' }],
      }).success,
    ).toBe(false);
  });
});

describe('idempotency, replay, recovery, and concurrency metadata', () => {
  it.each([
    { outcome: 'committed', replayed: false, retryAllowed: false },
    { outcome: 'committed', replayed: true, retryAllowed: false },
    {
      outcome: 'unknown',
      replayed: false,
      retryAllowed: false,
      recoveryRequired: true,
      code: 'COMMAND_OUTCOME_UNKNOWN',
      correlationId: syntheticIds.correlation,
    },
  ])('accepts command metadata branch %#', (metadata) => {
    expect(commandResultMetadataSchema.safeParse(metadata).success).toBe(true);
  });

  it('rejects contradictory command and recovery states', () => {
    expect(
      commandResultMetadataSchema.safeParse({
        outcome: 'unknown',
        replayed: false,
        retryAllowed: true,
        recoveryRequired: true,
        code: 'COMMAND_OUTCOME_UNKNOWN',
        correlationId: syntheticIds.correlation,
      }).success,
    ).toBe(false);
    expect(
      recoveryResultMetadataSchema.safeParse({
        outcome: 'notCommitted',
        retryAllowed: false,
        recovered: true,
      }).success,
    ).toBe(false);
  });

  it('permits safe retry only for an authoritative no-commit recovery result', () => {
    const noCommit = recoveryResultMetadataSchema.parse({
      outcome: 'notCommitted',
      retryAllowed: true,
      recovered: true,
    });
    expect(noCommit.retryAllowed).toBe(true);
    expect(
      recoveryResultMetadataSchema.parse({
        outcome: 'unknown',
        retryAllowed: false,
        recovered: false,
        recoveryRequired: true,
        code: 'COMMAND_OUTCOME_UNKNOWN',
        correlationId: syntheticIds.correlation,
      }).retryAllowed,
    ).toBe(false);
  });

  it('keeps recovery context narrow and rejects unknown request fields', () => {
    expect(recoveryRequestSchema.parse({ operationCode: 'SALE_CONFIRM' })).toEqual({
      operationCode: 'SALE_CONFIRM',
    });
    expect(
      recoveryRequestSchema.safeParse({ operationCode: 'SALE_CONFIRM', newIntent: true }).success,
    ).toBe(false);
  });

  it('accepts only strong opaque If-Match validators', () => {
    expect(conditionalRequestSchema.parse({ ifMatch: '"revision-synthetic-001"' })).toEqual({
      ifMatch: '"revision-synthetic-001"',
    });
    expect(conditionalRequestSchema.safeParse({ ifMatch: 'W/"weak"' }).success).toBe(false);
  });
});

describe('pagination, projection metadata, and envelopes', () => {
  it('enforces bounded cursor pagination and cursor presence when more data exists', () => {
    expect(pageRequestSchema.parse({ limit: 50, after: 'cursor-synthetic-001' })).toEqual({
      limit: 50,
      after: 'cursor-synthetic-001',
    });
    expect(pageRequestSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(pageMetadataSchema.safeParse({ hasMore: true }).success).toBe(false);
    expect(pageMetadataSchema.parse({ hasMore: false })).toEqual({ hasMore: false });
  });

  it.each(['current', 'stale', 'unavailable'] as const)(
    'accepts explicit %s non-canonical projection metadata',
    (freshness) => {
      const metadata = projectionSourceMetadataSchema.parse({
        source: 'projection',
        generatedAt: '2026-08-01T14:30:00Z',
        asOf: '2026-08-01T14:29:00Z',
        timeZone: 'America/Manaus',
        freshness,
      });
      expect(metadata.source).toBe('projection');
      expect(metadata.freshness).toBe(freshness);
    },
  );

  it('builds versioned data and metadata envelopes', () => {
    const schema = successEnvelopeSchema(z.array(z.string()), pageMetadataSchema);
    expect(schema.parse({ data: [], meta: { hasMore: false } })).toEqual({
      data: [],
      meta: { hasMore: false },
    });
    expect(dataEnvelopeSchema(z.string()).safeParse({ data: 3 }).success).toBe(false);
  });
});

describe('Payment Request delivery metadata', () => {
  it.each([
    'prepared',
    'deliveryPending',
    'delivered',
    'deliveryFailed',
    'cancelled',
    'expired',
  ] as const)('keeps %s separate from Payment receipt', (status) => {
    expect(
      paymentRequestStatusMetadataSchema.parse({
        status,
        financialState: 'paymentNotRecorded',
      }),
    ).toEqual({ status, financialState: 'paymentNotRecorded' });
  });

  it('rejects a delivery state that claims payment receipt', () => {
    expect(
      paymentRequestStatusMetadataSchema.safeParse({
        status: 'delivered',
        financialState: 'paid',
      }).success,
    ).toBe(false);
  });
});

describe('public contract behavior', () => {
  it('does not mutate caller-owned input and produces JSON-safe parsed output', () => {
    const input = Object.freeze({ amountMinor: '2500', currency: 'BRL' as const });
    const parsed = moneySchema.parse(input);
    expect(parsed).not.toBe(input);
    expect(input).toEqual({ amountMinor: '2500', currency: 'BRL' });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('parses deterministically', () => {
    const input = { state: 'anonymous' as const };
    expect(sessionContextSchema.parse(input)).toEqual(sessionContextSchema.parse(input));
  });

  it('supports exhaustive inferred command metadata handling', () => {
    const summarize = (metadata: CommandResultMetadata): string => {
      switch (metadata.outcome) {
        case 'committed':
          return metadata.replayed ? 'replayed' : 'created';
        case 'unknown':
          return metadata.code;
      }
    };

    expect(summarize({ outcome: 'committed', replayed: true, retryAllowed: false })).toBe(
      'replayed',
    );
    const anonymous = { state: 'anonymous' } satisfies SessionContext;
    expect(sessionContextSchema.parse(anonymous)).toEqual(anonymous);
  });
});
