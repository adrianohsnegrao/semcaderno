import { currentSessionInspectionResponseSchema } from '../src/index.js';

const synthetic = {
  businessId: 'business-synthetic-session-001',
  userId: 'user-synthetic-session-001',
} as const;

describe('current session inspection response contract', () => {
  it('accepts the canonical anonymous representation', () => {
    expect(currentSessionInspectionResponseSchema.parse({ data: { state: 'anonymous' } })).toEqual({
      data: { state: 'anonymous' },
    });
  });

  it('accepts authenticated state without a selected Business', () => {
    expect(
      currentSessionInspectionResponseSchema.parse({
        data: {
          state: 'authenticated',
          userId: synthetic.userId,
          expiresAt: '2026-08-05T18:00:00Z',
        },
      }),
    ).toEqual({
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-05T18:00:00Z',
      },
    });
  });

  it('accepts authenticated state with selected Business context', () => {
    expect(
      currentSessionInspectionResponseSchema.parse({
        data: {
          state: 'authenticated',
          userId: synthetic.userId,
          expiresAt: '2026-08-05T18:00:00Z',
          selectedBusiness: { businessId: synthetic.businessId },
        },
      }),
    ).toEqual({
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-05T18:00:00Z',
        selectedBusiness: { businessId: synthetic.businessId },
      },
    });
  });

  it.each([
    { data: { state: 'expired' } },
    { data: { state: 'authenticated', expiresAt: '2026-08-05T18:00:00Z' } },
    { data: { state: 'authenticated', userId: synthetic.userId } },
    {
      data: {
        state: 'authenticated',
        userId: '',
        expiresAt: '2026-08-05T18:00:00Z',
      },
    },
    {
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-05T14:00:00-04:00',
      },
    },
    {
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-05T18:00:00Z',
        selectedBusiness: null,
      },
    },
    {
      data: {
        state: 'authenticated',
        userId: synthetic.userId,
        expiresAt: '2026-08-05T18:00:00Z',
        selectedBusiness: { businessId: ' ' },
      },
    },
  ])('rejects invalid operation response %#', (response) => {
    expect(currentSessionInspectionResponseSchema.safeParse(response).success).toBe(false);
  });

  it('ignores additive response keys and exposes only reviewed fields', () => {
    expect(
      currentSessionInspectionResponseSchema.parse({
        data: { state: 'anonymous', futureSafeField: true },
        futureEnvelopeField: 'synthetic',
      }),
    ).toEqual({ data: { state: 'anonymous' } });
  });

  it('produces JSON-safe output without mutating caller input', () => {
    const input = Object.freeze({
      data: Object.freeze({
        state: 'authenticated' as const,
        userId: synthetic.userId,
        expiresAt: '2026-08-05T18:00:00Z',
      }),
    });

    const parsed = currentSessionInspectionResponseSchema.parse(input);
    expect(parsed).not.toBe(input);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(input.data).toEqual({
      state: 'authenticated',
      userId: synthetic.userId,
      expiresAt: '2026-08-05T18:00:00Z',
    });
  });

  it('parses deterministically', () => {
    const input = { data: { state: 'anonymous' as const } };
    expect(currentSessionInspectionResponseSchema.parse(input)).toEqual(
      currentSessionInspectionResponseSchema.parse(input),
    );
  });
});
