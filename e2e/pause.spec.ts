import { expect, test } from '@playwright/test';
import { expectTicksToGrow, readTicks, startRun } from './helpers';

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
    await page.waitForTimeout(400);
    const ticksWhenPaused = await readTicks(page);

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

  test('the pause button is big enough to hit with a thumb', async ({ page }) => {
    await startRun(page);

    const box = (await page.getByRole('button', { name: 'Pause' }).boundingBox())!;

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
    await expect(page.getByTestId('viper-x')).toBeVisible();
    await expect
      .poll(async () => readTicks(page), { message: 'a new run starts its tick count over' })
      .toBeLessThan(ticksWhenAbandoned);
  });

  test('mute is labeled, large enough, and remembered', async ({ page }) => {
    await page.goto('/');
    const mute = page.getByRole('button', { name: 'Mute' });
    await expect(mute).toBeVisible();
    const box = (await mute.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await mute.click();
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
  });
});
