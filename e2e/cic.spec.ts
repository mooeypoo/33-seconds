import { expect, test } from '@playwright/test';
import { hudButton, startRun } from './helpers';

/** The CIC shell (ADR-0002 Phase 2): consoles beside the lane on a wide window, strips on a phone. */
test.describe('the CIC shell', () => {
  test.describe('on a full desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('the consoles stand by on the title, then come up with the run', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Wide windows only.');
      await page.goto('/');
      const fleet = page.getByRole('complementary', { name: 'Fleet console' });
      const comms = page.getByRole('complementary', { name: 'Comms console' });
      await expect(fleet).toContainText('Standby');
      await expect(page.getByTestId('title-quote')).not.toBeEmpty();

      await startRun(page);
      await expect(fleet).not.toContainText('Standby');
      await expect(fleet.getByRole('region', { name: 'Civilian fleet' }).getByRole('listitem')).toHaveCount(10);
      await expect(fleet).toContainText('Galactica');
      await expect(page.getByTestId('cycle-clock')).toBeVisible();
      await expect(comms.getByRole('region', { name: 'Recent comms' })).toBeVisible();
      await expect(comms.getByTestId('missile-ammo')).toHaveText('3/3');
    });

    test('keeps the action buttons off a desktop', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Wide windows only.');
      await startRun(page);
      await expect(page.getByTestId('fire-missile')).toHaveCount(0);
    });
  });

  test.describe('on a laptop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('folds the ship list, moves the log to the pause menu, and keeps the loadout short', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Wide windows only.');
      await startRun(page);
      const fleet = page.getByRole('complementary', { name: 'Fleet console' });
      const comms = page.getByRole('complementary', { name: 'Comms console' });
      await expect(fleet.getByRole('region', { name: 'Civilian fleet' }).getByRole('list')).toBeHidden();
      await expect(comms.getByRole('region', { name: 'Recent comms' })).toBeHidden();
      await expect(comms).toContainText('In the pause menu');
    });
  });

  test('on a phone the objective rides in the status row, with no consoles', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phones only.');
    await startRun(page);
    await expect(page.getByTestId('status-objective')).not.toBeEmpty();
    await expect(page.getByRole('complementary', { name: 'Fleet console' })).toHaveCount(0);
  });

  test('the pause menu keeps the comms log', async ({ page }) => {
    await startRun(page);
    // The first line of a run is spoken at the start of cycle 1.
    await expect(page.getByTestId('comms').first()).toBeVisible({ timeout: 10_000 });
    await (await hudButton(page, 'Pause')).click();
    const log = page.getByTestId('comms-log');
    await expect(log).toBeVisible();
    await expect(log.getByRole('listitem').first()).not.toBeEmpty();
  });
});
