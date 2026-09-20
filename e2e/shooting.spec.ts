import { expect, test } from '@playwright/test';
import { startRun } from './helpers';

/** Auto-fire is always on: once a run starts, shots exist without the player pressing anything. */
test.describe('auto-fire', () => {
  test('the Viper shoots on its own after Launch', async ({ page }) => {
    await startRun(page);

    await expect
      .poll(async () => Number(await page.getByTestId('shots').textContent()), {
        message: 'auto-fire should put at least one shot on screen',
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    await expect(page.getByTestId('hull')).toBeVisible();
  });
});
