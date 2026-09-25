#!/usr/bin/env node
// Renders the link-preview card and the favicons into public/, which Vite copies to the site root.
// Run it by hand after changing assets/share/share-card.svg, the Viper sprite, or the fonts, and
// commit the PNGs and the SVG (it refreshes the fonts and sprite embedded in the card first).
// It borrows the Chromium that Playwright already installs, so it needs no image dependency.
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const OUT = 'public';
const CARD_SVG = 'assets/share/share-card.svg';
const VIPER_PNG = 'assets/ships/viper_neutral.png';
const CARD = { width: 1200, height: 630 };
/** The game's own fonts, embedded in the card so it renders the same in any viewer. */
const CARD_FONTS = [
  { family: 'VT323', file: 'assets/fonts/vt323-latin-400-normal.woff2' },
  { family: 'Atkinson Hyperlegible', file: 'assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2' },
];
const EMBEDDED = /<!-- embedded:start[^]*?<!-- embedded:end -->/;
const SITE_URL_TEXT = /(<text id="site-url"[^>]*>)[^<]*(<\/text>)/;
/** The tab icon and the iOS home-screen icon. iOS paints transparency black, so that one gets a backdrop. */
const ICONS = [
  { file: 'favicon-32.png', size: 32, backdrop: null },
  { file: 'apple-touch-icon.png', size: 180, backdrop: '#0b0e14' },
];

async function dataUri(file, type) {
  return `data:${type};base64,${(await readFile(file)).toString('base64')}`;
}

// Refresh the embedded block from assets/, so the card never drifts from the game's files.
const viper = await dataUri(VIPER_PNG, 'image/png');
const fontFaces = await Promise.all(
  CARD_FONTS.map(
    async ({ family, file }) => `    @font-face { font-family: '${family}'; src: url('${await dataUri(file, 'font/woff2')}') format('woff2'); }`,
  ),
);
// The card shows the same address the meta tags use, without the scheme: `homepage` in package.json.
const { homepage } = JSON.parse(await readFile('package.json', 'utf8'));
const siteAddress = new URL(homepage).host;

const svg = await readFile(CARD_SVG, 'utf8');
if (!EMBEDDED.test(svg)) throw new Error(`${CARD_SVG} is missing its embedded:start / embedded:end block.`);
if (!SITE_URL_TEXT.test(svg)) throw new Error(`${CARD_SVG} is missing its <text id="site-url"> element.`);
const block = [
  '<!-- embedded:start. Written by `npm run render:share` from assets/; do not edit by hand. -->',
  '  <style>',
  ...fontFaces,
  '  </style>',
  '  <defs>',
  `    <image id="viper" width="64" height="64" style="image-rendering: pixelated" href="${viper}" />`,
  '  </defs>',
  '  <!-- embedded:end -->',
].join('\n');
await writeFile(CARD_SVG, svg.replace(EMBEDDED, block).replace(SITE_URL_TEXT, `$1${siteAddress}$2`));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: CARD });
  await page.goto(pathToFileURL(CARD_SVG).href);
  // A broken SVG or a missing font still screenshots fine, so check both before trusting the image.
  const problem = await page.evaluate(async (families) => {
    if (document.querySelector('parsererror')) return 'the SVG does not parse';
    await document.fonts.ready;
    const loaded = [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family);
    const missing = families.filter((family) => !loaded.includes(family));
    return missing.length ? `fonts did not load: ${missing.join(', ')}` : null;
  }, CARD_FONTS.map((font) => font.family));
  if (problem) throw new Error(`${CARD_SVG}: ${problem}.`);
  await page.screenshot({ path: `${OUT}/og-image.png` });
  console.log(`render-share-images: wrote ${OUT}/og-image.png`);

  // The card page is an SVG document, which cannot take HTML, so the icons get their own page.
  const iconPage = await browser.newPage();
  for (const icon of ICONS) {
    // A little padding on the backed icon, so iOS's rounded corners do not clip the wings.
    const inset = icon.backdrop ? Math.round(icon.size * 0.1) : 0;
    await iconPage.setViewportSize({ width: icon.size, height: icon.size });
    await iconPage.setContent(
      `<body style="margin:0;background:${icon.backdrop ?? 'transparent'}">` +
        `<img src="${viper}" style="display:block;margin:${inset}px;width:${icon.size - 2 * inset}px;` +
        `height:${icon.size - 2 * inset}px;image-rendering:pixelated"></body>`,
    );
    await iconPage.screenshot({ path: `${OUT}/${icon.file}`, omitBackground: !icon.backdrop });
    console.log(`render-share-images: wrote ${OUT}/${icon.file}`);
  }
} finally {
  await browser.close();
}
