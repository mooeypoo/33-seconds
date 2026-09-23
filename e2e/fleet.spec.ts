import { expect, test } from '@playwright/test';
import { startRun } from './helpers';

test.describe('fleet integrity', () => {
  test('shows the fleet readout once a run starts', async ({ page }) => {
    await startRun(page);

    await expect(page.getByTestId('fleet-readout')).toBeVisible();
    await expect(page.getByTestId('fleet')).toHaveText('100%');
  });
});
