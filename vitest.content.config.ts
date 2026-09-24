import { defineConfig } from 'vitest/config';

/**
 * `npm run check:content` only (ADR-0001 D8). Content checks are a gate on the JSON writers
 * change, not engine tests, so they stay out of `npm test` and run as their own CI step.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/content/**/*.check.ts'],
  },
});
