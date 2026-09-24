import { defineConfig } from 'vitest/config';

/**
 * `npm run sim` only: the balance harness report (ADR-0001 D13). Slow on purpose, so it is not part
 * of `npm test`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/sim/**/*.sim.ts'],
    testTimeout: 600_000,
  },
});
