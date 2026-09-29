import { expect, test } from '@playwright/test';

/**
 * Challenges (PRD 11.1): launched from the title's sheet, and passed on through a share link that
 * offers Beat this. The share sheet is switched off so Share link takes the clipboard path on the
 * phone project too, as in end-screen.spec.ts.
 */
test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});

test.describe('challenges', () => {
  test('the title lists them, and one launches a run that names it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-challenges').click();
    const sheet = page.getByRole('dialog', { name: 'Challenges' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Swarm' })).toBeVisible();

    await sheet.getByTestId('launch-swarm').click();
    await expect(page.getByTestId('viper-x')).toBeAttached();
    await expect(page.getByTestId('status-challenge').first()).toHaveText('Swarm');
  });

  test("this week's challenge comes first, says what it changes, and launches as its week", async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-challenges').click();
    const sheet = page.getByRole('dialog', { name: 'Challenges' });
    const week = sheet.getByRole('heading', { name: /^Week \d{1,2}$/ });
    await expect(week).toBeVisible();
    const name = (await week.textContent())?.trim() ?? '';
    await expect(sheet.getByRole('heading', { level: 3 }).first()).toHaveText(name);
    await expect(sheet.getByTestId('weekly-details').getByRole('listitem').first()).toBeVisible();

    await sheet.getByTestId('launch-weekly').click();
    await expect(page.getByTestId('viper-x')).toBeAttached();
    await expect(page.getByTestId('status-challenge').first()).toHaveText(name);
  });

  test('Endless flies with no ship and shows the repair Tyrol can still manage', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-challenges').click();
    await page.getByTestId('launch-endless').click();
    await expect(page.getByTestId('viper-x')).toBeAttached();
    await expect(page.getByTestId('status-challenge').first()).toHaveText('Endless');
    await expect(page.getByTestId('status-repair').first()).toHaveText('Repair 60%');
  });

  test("Baltar's FTL upgrade counts down from 66, not 33", async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-challenges').click();
    await page.getByTestId('launch-slow-ftl').click();
    await expect(page.getByTestId('viper-x')).toBeAttached();
    // A few seconds may pass before the read; any story cycle would already be under 34.
    await expect
      .poll(async () => Number(await page.getByTestId('seconds-remaining').first().textContent()))
      .toBeGreaterThan(55);
  });

  test('a shared challenge result offers Beat this, which plays the same challenge', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Simulate challenge' }).click();
    const verdict = (await page.getByTestId('verdict').textContent())?.trim() ?? '';
    expect(verdict.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Share link' }).click();
    await expect(page.getByRole('status')).toHaveText('Link copied.');
    const link = await page.evaluate(() => navigator.clipboard.readText());

    const friend = await context.newPage();
    await friend.goto(link);
    await expect(friend.getByTestId('shared-result')).toBeVisible();
    await expect(friend.getByTestId('verdict')).toHaveText(verdict);
    await expect(friend.getByTestId('beat-this')).toBeFocused();

    await friend.getByTestId('beat-this').click();
    await expect(friend.getByTestId('viper-x')).toBeAttached();
    await expect(friend.getByTestId('status-challenge').first()).toBeVisible();
    // Beat this leaves the link behind, so a reload is a fresh title, not the shared run again.
    expect(new URL(friend.url()).hash).toBe('');
  });
});
