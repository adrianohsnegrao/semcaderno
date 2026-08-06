import {
  createInspectCurrentSession,
  type AuthenticatedSessionInspection,
  type ResolveSessionInput,
  type SessionResolutionPort,
} from '../src/index.js';

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

const sessionLookup = Object.freeze({
  digestVersion: 1 as const,
  digestBase64Url: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
});

describe('inspect current session application boundary', () => {
  it('returns anonymous without consulting persistence when evidence is absent', async () => {
    const resolver = new StubSessionResolution(undefined);
    const inspection = createInspectCurrentSession(resolver);

    await expect(
      inspection.execute({ evaluatedAt: new Date('2026-08-05T18:00:00Z') }),
    ).resolves.toEqual({ state: 'anonymous' });
    expect(resolver.calls).toEqual([]);
  });

  it('passes the explicit lookup key and evaluation instant to the resolver', async () => {
    const evaluatedAt = new Date('2026-08-05T18:00:00Z');
    const state: AuthenticatedSessionInspection = Object.freeze({
      state: 'authenticated',
      userId: 'user-synthetic-application-001',
      expiresAt: new Date('2026-08-05T19:00:00Z'),
      selectedBusinessId: 'business-synthetic-application-001',
    });
    const resolver = new StubSessionResolution(state);

    await expect(
      createInspectCurrentSession(resolver).execute({ sessionLookup, evaluatedAt }),
    ).resolves.toBe(state);
    expect(resolver.calls).toEqual([{ sessionLookup, evaluatedAt }]);
  });

  it('normalizes an unknown or inactive lookup to anonymous', async () => {
    const resolver = new StubSessionResolution(undefined);

    await expect(
      createInspectCurrentSession(resolver).execute({
        sessionLookup,
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).resolves.toEqual({ state: 'anonymous' });
  });

  it('propagates resolver infrastructure failures', async () => {
    const failure = new Error('synthetic infrastructure failure');
    const resolver = new StubSessionResolution(undefined, failure);

    await expect(
      createInspectCurrentSession(resolver).execute({
        sessionLookup,
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).rejects.toBe(failure);
  });

  it('does not mutate evidence, time, or authenticated state', async () => {
    const evaluatedAt = new Date('2026-08-05T18:00:00Z');
    const expiresAt = new Date('2026-08-05T19:00:00Z');
    const state: AuthenticatedSessionInspection = Object.freeze({
      state: 'authenticated',
      userId: 'user-synthetic-application-002',
      expiresAt,
    });
    const resolver = new StubSessionResolution(state);

    await createInspectCurrentSession(resolver).execute({ sessionLookup, evaluatedAt });

    expect(sessionLookup.digestBase64Url).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(evaluatedAt.toISOString()).toBe('2026-08-05T18:00:00.000Z');
    expect(expiresAt.toISOString()).toBe('2026-08-05T19:00:00.000Z');
  });
});
