import { expect, test } from '@playwright/test';
import { startRun } from './helpers';

test.describe('the jump clock', () => {
  test('shows the 33 once a run starts', async ({ page }) => {
    await startRun(page);

    await expect(page.getByTestId('cycle-clock')).toBeVisible();
    const remaining = Number(await page.getByTestId('seconds-remaining').textContent());
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(33);
  });
});
