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

test.describe('the HUD says it in words', () => {
  test('names hull, the loop, and the objective, not only colours', async ({ page }) => {
    await startRun(page);

    await expect(page.getByTestId('status-hull')).toHaveText(/Hull \d\/\d/);
    await expect(page.getByTestId('status-loop')).toHaveText('Loop on');
    // The words are content (hud.json) and may be rewritten; the stage logic has unit tests.
    await expect(page.getByTestId('objective')).toHaveText(/\S/);
  });
});
