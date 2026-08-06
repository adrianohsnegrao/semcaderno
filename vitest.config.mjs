import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'packages/contracts/test/**/*.test.ts',
      'packages/application/test/**/*.test.ts',
      'packages/persistence-postgres/test/**/*.test.ts',
      'apps/server/test/**/*.test.ts',
    ],
  },
});
