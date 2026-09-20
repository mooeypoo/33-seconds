#!/usr/bin/env node
// Prints the gzipped size of the built JavaScript, so bundle growth shows up in CI.
// The budget in ADR-0001 D4 (gate 4) is about 300 KB gzipped for the initial JavaScript.
import { gzipSync } from 'node:zlib';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ASSETS_DIR = 'dist/assets';
const BUDGET_KB = 300;

const files = (await readdir(ASSETS_DIR)).filter((f) => f.endsWith('.js'));
let totalGzip = 0;
const rows = [];

for (const file of files.sort()) {
  const bytes = await readFile(join(ASSETS_DIR, file));
  const gzip = gzipSync(bytes, { level: 9 }).byteLength;
  totalGzip += gzip;
  rows.push(`| \`${file}\` | ${kb(bytes.byteLength)} | ${kb(gzip)} |`);
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

const verdict = totalGzip / 1024 <= BUDGET_KB ? 'within budget' : 'OVER BUDGET';

console.log('### Bundle size\n');
console.log('| File | Raw | Gzipped |');
console.log('|---|---|---|');
console.log(rows.join('\n'));
console.log(`\n**Total JavaScript: ${kb(totalGzip)} gzipped** (budget ${BUDGET_KB} KB, ${verdict}).`);
