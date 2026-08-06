const cryptographicFailure = new Error('synthetic cryptographic runtime failure');

vi.mock('node:crypto', () => ({
  createHmac: () => {
    throw cryptographicFailure;
  },
}));

describe('current session composition cryptographic failure boundary', () => {
  it('propagates an unexpected cryptographic failure instead of returning anonymous', async () => {
    const { createCurrentSessionInspectionComposition } =
      await import('../src/session-inspection-composition.js');
    const composition = createCurrentSessionInspectionComposition({
      hmacKey: new Uint8Array(32),
      inspectCurrentSession: {
        execute: () => Promise.resolve({ state: 'anonymous' }),
      },
    });

    await expect(
      composition.execute({
        sessionEvidence: 'v1.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
        evaluatedAt: new Date('2026-08-05T18:00:00Z'),
      }),
    ).rejects.toBe(cryptographicFailure);
  });
});
