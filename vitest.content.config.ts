import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * `npm run check:content` only (ADR-0001 D8). Content checks are a gate on the JSON writers
 * change, not engine tests, so they stay out of `npm test` and run as their own CI step.
 * The game version is defined as in the build, so the balance fingerprint can be checked against it.
 */
export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(version) },
  test: {
    environment: 'node',
    include: ['tests/content/**/*.check.ts'],
  },
});
