import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';

/**
 * The game version a shared result shows (PRD 17). Bump it in package.json when a change moves
 * scores: scoring.json, tiers.json, or a rule that changes how a run plays.
 */
const { version, homepage } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
  homepage: string;
};

/**
 * Link previews need absolute URLs (crawlers do not resolve relative ones), so index.html writes
 * `__SITE_URL__` and this fills it from `homepage` in package.json. Change the domain there.
 */
const siteUrl = homepage.replace(/\/?$/, '/');
const siteUrlPlugin: Plugin = {
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
};

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
  plugins: [vue(), siteUrlPlugin],
  define: { __GAME_VERSION__: JSON.stringify(version) },
  preview: { headers: SECURITY_HEADERS },
  build: {
    target: 'es2022',
    // The gzipped-size report is how we keep an eye on the bundle budget (ADR-0001 D4, gate 4).
    reportCompressedSize: true,
  },
});
