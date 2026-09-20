import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * The production headers live in `netlify.toml`, which is the source of truth. This copy exists so
 * that `vite preview` -- and therefore the end-to-end tests -- run under the same strict CSP, which
 * is how we check ADR-0001 D4 gate 3 without deploying. Keep the two in sync.
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export default defineConfig({
  plugins: [vue()],
  preview: { headers: SECURITY_HEADERS },
  build: {
    target: 'es2022',
    // The gzipped-size report is how we keep an eye on the bundle budget (ADR-0001 D4, gate 4).
    reportCompressedSize: true,
  },
});
