import type { SessionInspection } from '@sem-caderno/application';
import { currentSessionInspectionResponseSchema } from '@sem-caderno/contracts';

import { mapSessionInspectionToTransport } from '../src/session-inspection-mapper.js';

describe('session inspection server-edge mapper', () => {
  it('maps anonymous application state to canonical anonymous transport data', () => {
    expect(mapSessionInspectionToTransport({ state: 'anonymous' })).toEqual({
      data: { state: 'anonymous' },
    });
  });

  it('maps authenticated state without selected Business', () => {
    expect(
      mapSessionInspectionToTransport({
        state: 'authenticated',
        userId: 'user-synthetic-mapper-001',
        expiresAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).toEqual({
      data: {
        state: 'authenticated',
        userId: 'user-synthetic-mapper-001',
        expiresAt: '2026-08-05T18:00:00.000Z',
      },
    });
  });

  it('maps selected Business as nested non-authoritative transport context', () => {
    expect(
      mapSessionInspectionToTransport({
        state: 'authenticated',
        userId: 'user-synthetic-mapper-002',
        expiresAt: new Date('2026-08-05T19:00:00Z'),
        selectedBusinessId: 'business-synthetic-mapper-001',
      }),
    ).toEqual({
      data: {
        state: 'authenticated',
        userId: 'user-synthetic-mapper-002',
        expiresAt: '2026-08-05T19:00:00.000Z',
        selectedBusiness: { businessId: 'business-synthetic-mapper-001' },
      },
    });
  });

  it('produces output accepted by the executable transport schema', () => {
    const mapped = mapSessionInspectionToTransport({
      state: 'authenticated',
      userId: 'user-synthetic-mapper-003',
      expiresAt: new Date('2026-08-05T20:00:00Z'),
      selectedBusinessId: 'business-synthetic-mapper-002',
    });

    expect(currentSessionInspectionResponseSchema.parse(mapped)).toEqual(mapped);
  });

  it('is deterministic, does not mutate input, and does not leak extra application fields', () => {
    const expiresAt = new Date('2026-08-05T21:00:00Z');
    const input = Object.freeze({
      state: 'authenticated' as const,
      userId: 'user-synthetic-mapper-004',
      expiresAt,
      selectedBusinessId: 'business-synthetic-mapper-003',
      internalOnly: 'not-for-transport',
    }) satisfies SessionInspection & { internalOnly: string };

    const first = mapSessionInspectionToTransport(input);
    const second = mapSessionInspectionToTransport(input);

    expect(first).toEqual(second);
    expect(first).not.toHaveProperty('internalOnly');
    expect(input.internalOnly).toBe('not-for-transport');
    expect(expiresAt.toISOString()).toBe('2026-08-05T21:00:00.000Z');
  });
});
