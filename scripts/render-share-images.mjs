#!/usr/bin/env node
// Renders the link-preview card and the favicons into public/, which Vite copies to the site root.
// Run it by hand after changing assets/share/share-card.svg or the Viper sprite, and commit the PNGs.
// It borrows the Chromium that Playwright already installs, so it needs no image dependency.
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const OUT = 'public';
const CARD_SVG = 'assets/share/share-card.svg';
const VIPER_PNG = 'assets/ships/viper_neutral.png';
const CARD = { width: 1200, height: 630 };
/** The tab icon and the iOS home-screen icon. iOS paints transparency black, so that one gets a backdrop. */
const ICONS = [
  { file: 'favicon-32.png', size: 32, backdrop: null },
  { file: 'apple-touch-icon.png', size: 180, backdrop: '#0b0e14' },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: CARD });
  await page.goto(pathToFileURL(CARD_SVG).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/og-image.png` });
  console.log(`render-share-images: wrote ${OUT}/og-image.png`);

  // The card page is an SVG document, which cannot take HTML, so the icons get their own page.
  const iconPage = await browser.newPage();
  const viper = `data:image/png;base64,${(await readFile(VIPER_PNG)).toString('base64')}`;
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
