import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const titleCopy = JSON.parse(
  readFileSync(new URL('../src/content/title.json', import.meta.url), 'utf8'),
) as {
  title: string;
  body: string[];
  disclaimer: string;
  quotes: string[];
  manual: { fight: { heading: string }[] };
  inspired: string;
  credits: { byline: string; inspiration: string; thanks: string; links: { label: string; href: string }[] };
};

test.describe('title', () => {
  test('the face stays short, and the manual and credits open one step away', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: titleCopy.title })).toBeVisible();
    await expect(page.getByText(titleCopy.body[0] ?? '')).toBeVisible();
    await expect(page.getByText(titleCopy.inspired)).toBeVisible();
    await expect(page.getByText(titleCopy.disclaimer)).toBeVisible();
    const quote = (await page.getByTestId('title-quote').textContent())?.trim() ?? '';
    expect(titleCopy.quotes).toContain(quote);

    const launch = page.getByRole('button', { name: 'Launch' });
    const launchBox = (await launch.boundingBox())!;
    expect(launchBox.height).toBeGreaterThanOrEqual(44);

    await page.getByRole('button', { name: 'How to fly' }).click();
    const manual = page.getByRole('dialog', { name: 'How to fly' });
    await expect(manual).toBeVisible();
    await expect(manual.getByText(titleCopy.body[1] ?? '')).toBeVisible();
    await expect(manual.getByRole('heading', { name: 'They come back' })).toHaveCount(0);
    await manual.getByRole('tab', { name: 'How to play' }).click();
    await expect(manual.getByRole('heading', { name: 'They come back' })).toBeVisible();
    await expect(manual).toContainText('resurrection ship');

    await page.locator('.sheet-layer').click({ position: { x: 4, y: 4 } });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('title-quote')).toHaveText(quote);

    await page.getByRole('button', { name: 'Credits' }).click();
    const credits = page.getByRole('dialog', { name: 'Credits' });
    await expect(credits.getByText(titleCopy.credits.byline)).toBeVisible();
    await expect(credits.getByText(titleCopy.credits.inspiration)).toBeVisible();
    await expect(credits.getByText(titleCopy.credits.thanks)).toBeVisible();
    for (const link of titleCopy.credits.links) {
      const anchor = credits.getByRole('link', { name: link.label });
      await expect(anchor).toHaveAttribute('href', link.href);
      await expect(anchor).toHaveAttribute('target', '_blank');
      await expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    }

    await credits.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(launch).toBeVisible();
    await expect(page.getByTestId('title-quote')).toHaveText(quote);
  });

  test('a phone-width face does not spill sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const howTo = page.getByRole('button', { name: 'How to fly' });
    const box = (await howTo.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    const spills = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(spills).toBe(false);
  });
});
