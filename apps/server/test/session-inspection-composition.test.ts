import {
  createInspectCurrentSession,
  type AuthenticatedSessionInspection,
  type InspectCurrentSession,
  type InspectCurrentSessionInput,
  type ResolveSessionInput,
  type SessionResolutionPort,
} from '@sem-caderno/application';
import { currentSessionInspectionResponseSchema } from '@sem-caderno/contracts';

import { createCurrentSessionInspectionComposition } from '../src/session-inspection-composition.js';

const canonicalEvidence = 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
const canonicalLookup = Object.freeze({
  digestVersion: 1 as const,
  digestBase64Url: 'niLdvDD4hoMy8DgE1YzhZhVw3hiRvuazP3OY6t32B7w',
});
const evaluatedAt = new Date('2026-08-05T18:00:00Z');
const hmacKey = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);

class StubSessionResolution implements SessionResolutionPort {
  readonly calls: ResolveSessionInput[] = [];

  constructor(
    private readonly result: AuthenticatedSessionInspection | undefined,
    private readonly failure?: Error,
  ) {}

  resolve(input: ResolveSessionInput): Promise<AuthenticatedSessionInspection | undefined> {
    this.calls.push(input);
    return this.failure === undefined ? Promise.resolve(this.result) : Promise.reject(this.failure);
  }
}

const composeWith = (resolver: SessionResolutionPort) =>
  createCurrentSessionInspectionComposition({
    hmacKey,
    inspectCurrentSession: createInspectCurrentSession(resolver),
  });

describe('current session inspection server composition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the stable anonymous response for missing evidence without resolution', async () => {
    const resolver = new StubSessionResolution(undefined);

    await expect(composeWith(resolver).execute({ evaluatedAt })).resolves.toEqual({
      data: { state: 'anonymous' },
    });
    expect(resolver.calls).toEqual([]);
  });

  it.each([
    { label: 'empty evidence', sessionEvidence: '' },
    {
      label: 'unsupported version',
      sessionEvidence: 'v2.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
    },
    {
      label: 'padded encoding',
      sessionEvidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=',
    },
  ])('normalizes $label without resolution or logging', async ({ sessionEvidence }) => {
    const resolver = new StubSessionResolution(undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(composeWith(resolver).execute({ sessionEvidence, evaluatedAt })).resolves.toEqual({
      data: { state: 'anonymous' },
    });
    expect(resolver.calls).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('passes only the canonical lookup and original evaluation instant inward', async () => {
    const resolver = new StubSessionResolution(undefined);

    await expect(
      composeWith(resolver).execute({ sessionEvidence: canonicalEvidence, evaluatedAt }),
    ).resolves.toEqual({ data: { state: 'anonymous' } });
    expect(resolver.calls).toEqual([{ sessionLookup: canonicalLookup, evaluatedAt }]);
    expect(JSON.stringify(resolver.calls)).not.toContain(canonicalEvidence);
  });

  it.each([
    {
      label: 'without selected Business',
      state: Object.freeze({
        state: 'authenticated' as const,
        userId: 'user-synthetic-composition-001',
        expiresAt: new Date('2026-08-05T19:00:00Z'),
      }),
      expected: {
        data: {
          state: 'authenticated',
          userId: 'user-synthetic-composition-001',
          expiresAt: '2026-08-05T19:00:00.000Z',
        },
      },
    },
    {
      label: 'with selected Business context',
      state: Object.freeze({
        state: 'authenticated' as const,
        userId: 'user-synthetic-composition-002',
        expiresAt: new Date('2026-08-05T20:00:00Z'),
        selectedBusinessId: 'business-synthetic-composition-001',
      }),
      expected: {
        data: {
          state: 'authenticated',
          userId: 'user-synthetic-composition-002',
          expiresAt: '2026-08-05T20:00:00.000Z',
          selectedBusiness: { businessId: 'business-synthetic-composition-001' },
        },
      },
    },
  ])('maps an active session $label', async ({ state, expected }) => {
    const result = await composeWith(new StubSessionResolution(state)).execute({
      sessionEvidence: canonicalEvidence,
      evaluatedAt,
    });

    expect(result).toEqual(expected);
    expect(currentSessionInspectionResponseSchema.parse(result)).toEqual(result);
  });

  it('propagates persistence and application failures without anonymous normalization', async () => {
    const failure = new Error('synthetic persistence failure');

    await expect(
      composeWith(new StubSessionResolution(undefined, failure)).execute({
        sessionEvidence: canonicalEvidence,
        evaluatedAt,
      }),
    ).rejects.toBe(failure);
  });

  it('propagates mapping failures without exposing the raw evidence', async () => {
    const state = Object.freeze({
      state: 'authenticated' as const,
      userId: 'user-synthetic-composition-003',
      expiresAt: new Date('invalid'),
    });

    try {
      await composeWith(new StubSessionResolution(state)).execute({
        sessionEvidence: canonicalEvidence,
        evaluatedAt,
      });
      expect.fail('Expected invalid mapped time to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError);
      expect(String(error)).not.toContain(canonicalEvidence);
    }
  });

  it('propagates unexpected application failures', async () => {
    const failure = new Error('synthetic application failure');
    const inspectCurrentSession: InspectCurrentSession = {
      execute: () => Promise.reject(failure),
    };
    const composition = createCurrentSessionInspectionComposition({
      hmacKey,
      inspectCurrentSession,
    });

    await expect(
      composition.execute({ sessionEvidence: canonicalEvidence, evaluatedAt }),
    ).rejects.toBe(failure);
  });

  it('rejects invalid HMAC configuration at construction without operation input', () => {
    const inspectCurrentSession: InspectCurrentSession = {
      execute: () => Promise.resolve({ state: 'anonymous' }),
    };

    expect(() =>
      createCurrentSessionInspectionComposition({
        hmacKey: new Uint8Array(31),
        inspectCurrentSession,
      }),
    ).toThrow('Session HMAC key must contain at least 32 bytes.');
  });

  it('is deterministic and does not mutate operation input, time, or caller-owned key', async () => {
    const input = Object.freeze({ sessionEvidence: canonicalEvidence, evaluatedAt });
    const mutableKey = Uint8Array.from(hmacKey);
    const calls: InspectCurrentSessionInput[] = [];
    const inspectCurrentSession: InspectCurrentSession = {
      execute: (applicationInput) => {
        calls.push(applicationInput);
        return Promise.resolve({ state: 'anonymous' });
      },
    };
    const composition = createCurrentSessionInspectionComposition({
      hmacKey: mutableKey,
      inspectCurrentSession,
    });
    mutableKey.fill(0);

    const first = await composition.execute(input);
    const second = await composition.execute(input);

    expect(first).toEqual(second);
    expect(calls).toEqual([
      { sessionLookup: canonicalLookup, evaluatedAt },
      { sessionLookup: canonicalLookup, evaluatedAt },
    ]);
    expect(input.sessionEvidence).toBe(canonicalEvidence);
    expect(evaluatedAt.toISOString()).toBe('2026-08-05T18:00:00.000Z');
  });
});
