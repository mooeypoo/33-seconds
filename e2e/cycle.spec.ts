import { expect, test } from '@playwright/test';
import { startRun } from './helpers';

test.describe('the jump clock', () => {
  test('shows the 33 once a run starts', async ({ page }) => {
    await startRun(page);

    // The painted 33 sits in the playfield, behind the ships. This node is the accessible copy.
    await expect(page.getByTestId('cycle-clock')).toBeAttached();
    const remaining = Number(await page.getByTestId('seconds-remaining').textContent());
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(33);
  });
});
