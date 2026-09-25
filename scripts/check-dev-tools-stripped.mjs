#!/usr/bin/env node
// Runs after `vite build`. The Simulate win / lose buttons (DevEndPreview.vue) are for development
// and the Playwright build only. A production build must not contain them, so this fails the build
// if their marker shows up in any emitted file. The Playwright build sets VITE_SHOW_DEBUG and keeps them.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const MARKERS = ['data-dev-tools', 'Simulate win'];

if (process.env.VITE_SHOW_DEBUG === 'true') {
  console.log('check-dev-tools-stripped: skipped, this is the test build (VITE_SHOW_DEBUG=true).');
  process.exit(0);
}

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)])),
  );
  return nested.flat();
}

const leaks = [];
for (const file of await files(DIST)) {
  if (!/\.(js|html|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const marker of MARKERS) if (text.includes(marker)) leaks.push(`${file}: "${marker}"`);
}

if (leaks.length > 0) {
  console.error('Development tools leaked into the production build:\n' + leaks.map((leak) => `  ${leak}`).join('\n'));
  process.exit(1);
}
console.log('check-dev-tools-stripped: no development tools in the production build.');
