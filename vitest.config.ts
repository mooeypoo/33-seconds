import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The domain and the session are pure, so the engine tests run in Node with no DOM at all.
    // That is the point of the layer rule: the game's rules are testable without a browser.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
