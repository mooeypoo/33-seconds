import { expect, test, type Page } from '@playwright/test';
import { nextReadout, startRun } from './helpers';

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

    await page.getByRole('button', { name: 'Launch' }).click();
    await nextReadout(page);

    // The canvas exists, the loop is ticking, and the strict CSP did not break Phaser.
    await expect(page.locator('canvas')).toBeAttached();
    await expect(page.getByTestId('debug')).toContainText('ticks');
    expect(consoleErrors).toEqual([]);
  });

  test('Esc pauses, and the countdown brings the game back', async ({ page }) => {
    await startRun(page);
    await nextReadout(page);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    // The readout refreshes a few times a second, so let it catch up to the frozen tick count
    // before using it as the baseline.
    await nextReadout(page);
    const ticksWhenPaused = await readTicks(page);

    // Nothing advances while paused.
    await page.waitForTimeout(600);
    expect(await readTicks(page)).toBe(ticksWhenPaused);

    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByRole('status')).toBeVisible();

    // The countdown finishes on its own, and then the loop runs again.
    await expect(page.getByRole('status')).toBeHidden({ timeout: 6000 });
    await nextReadout(page);
    expect(await readTicks(page)).toBeGreaterThan(ticksWhenPaused);
  });

  test('losing window focus pauses the game by itself', async ({ page }) => {
    await startRun(page);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });

    await expect(page.getByText('window lost focus')).toBeVisible();
  });

  test('the pause button is big enough to hit with a thumb', async ({ page }) => {
    await startRun(page);

    const box = (await page.getByRole('button', { name: 'Pause' }).boundingBox())!;

    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

async function readTicks(page: Page): Promise<number> {
  const text = (await page.getByTestId('debug').textContent()) ?? '';
  const match = /(\d+) ticks/.exec(text);
  return match ? Number(match[1]) : -1;
}
