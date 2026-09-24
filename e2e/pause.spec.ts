import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectTicksToGrow, hudButton, readTicks, settledTicks, startRun } from './helpers';

const titleCopy = JSON.parse(
  readFileSync(new URL('../src/content/title.json', import.meta.url), 'utf8'),
) as { title: string; body: string[]; disclaimer: string; quotes: string[] };

/** Pause is a hard requirement: it has to work anywhere, and it has to actually freeze things. */
test.describe('pause', () => {
  test('boots and runs under the production security headers', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));

    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");

    await expect(page.getByRole('heading', { name: titleCopy.title })).toBeVisible();
    await expect(page.getByText(titleCopy.body[0] ?? '')).toBeVisible();
    await expect(page.getByText(titleCopy.disclaimer)).toBeVisible();
    const quote = (await page.getByTestId('title-quote').textContent())?.trim();
    expect(titleCopy.quotes).toContain(quote);

    await page.getByRole('button', { name: 'Launch' }).click();

    // The canvas exists, the loop is ticking, and the strict CSP did not break Phaser.
    await expect(page.locator('canvas')).toBeAttached();
    await expectTicksToGrow(page, 0);
    expect(consoleErrors).toEqual([]);
  });

  test('Esc pauses, and the countdown brings the game back', async ({ page }) => {
    await startRun(page);
    await expectTicksToGrow(page, 0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    // The readout refreshes a few times a second, so let it settle on the frozen tick count before
    // using it as a baseline.
    const ticksWhenPaused = await settledTicks(page);

    // Nothing advances while paused.
    await page.waitForTimeout(700);
    expect(await readTicks(page)).toBe(ticksWhenPaused);

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByTestId('countdown')).toBeVisible();

    // The countdown finishes on its own, and then the loop runs again. Both assertions matter: the
    // second one is also what proves the readout was live during the freeze above.
    await expect(page.getByTestId('countdown')).toBeHidden({ timeout: 10_000 });
    await expectTicksToGrow(page, ticksWhenPaused);
  });

  test('losing window focus pauses the game by itself', async ({ page }) => {
    await startRun(page);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });

    await expect(page.getByText('window lost focus')).toBeVisible();
  });

  test('About pauses on the how-to sheet, and Resume comes back', async ({ page }) => {
    await startRun(page);
    await expectTicksToGrow(page, 0);

    await (await hudButton(page, 'About')).click();
    const sheet = page.getByRole('dialog', { name: 'About' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('Protect the fleet');
    await expect(sheet).toContainText('Fan art inspired by Battlestar Galactica.');

    const ticksWhenPaused = await settledTicks(page);
    await page.waitForTimeout(700);
    expect(await readTicks(page)).toBe(ticksWhenPaused);

    await sheet.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByTestId('countdown')).toBeHidden({ timeout: 10_000 });
    await expectTicksToGrow(page, ticksWhenPaused);
  });

  test('the pause button is big enough to hit with a thumb', async ({ page }) => {
    await startRun(page);

    const box = (await (await hudButton(page, 'Pause')).boundingBox())!;

    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('abandon run returns to the title, and Launch starts over', async ({ page }) => {
    await startRun(page);
    await expectTicksToGrow(page, 20);

    await page.keyboard.press('Escape');
    const abandon = page.getByRole('button', { name: 'Abandon run' });
    await expect(abandon).toBeVisible();
    const box = (await abandon.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    const ticksWhenAbandoned = await readTicks(page);
    await abandon.click();
    await expect(page.getByRole('button', { name: 'Launch' })).toBeVisible();

    await page.getByRole('button', { name: 'Launch' }).click();
    // The debug readout is hidden on a phone. The node is still there, and that is what this checks.
    await expect(page.getByTestId('viper-x')).toBeAttached();
    await expect
      .poll(async () => readTicks(page), { message: 'a new run starts its tick count over' })
      .toBeLessThan(ticksWhenAbandoned);
  });

});
