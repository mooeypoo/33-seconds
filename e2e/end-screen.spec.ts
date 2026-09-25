import { expect, test, type Page } from '@playwright/test';

/**
 * The end screen and its share link (PRD 5.4, 17), reached through the development buttons that
 * the test build keeps and the production build strips. The system share sheet is switched off so
 * Share link takes the clipboard path on the phone project too: a headless browser has no sheet.
 */
test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
});

async function simulate(page: Page, outcome: 'win' | 'lose'): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: outcome === 'win' ? 'Simulate win' : 'Simulate lose' }).click();
}

test.describe('end screen', () => {
  test('a win shares a link that opens the same result, and Play leaves it for the title', async ({ page, context }) => {
    await simulate(page, 'win');
    const result = page.getByTestId('result-won');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Fleet saved');
    const score = (await page.getByTestId('result-score').textContent())?.trim() ?? '';
    expect(score).toMatch(/^[\d,]+$/);

    await page.getByRole('button', { name: 'Share link' }).click();
    await expect(page.getByRole('status')).toHaveText('Link copied.');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    // Sealed: the score is not sitting in the URL for anyone to edit.
    expect(link).toMatch(/#r=[A-Za-z0-9_-]+$/);
    expect(link).not.toContain(score.replace(/,/g, ''));

    const friend = await context.newPage();
    await friend.goto(link);
    const shared = friend.getByTestId('shared-result');
    await expect(shared).toBeVisible();
    await expect(friend.getByTestId('result-score')).toHaveText(score);
    await expect(shared).toContainText(/v\d+\.\d+\.\d+/);
    await expect(friend.getByRole('button', { name: 'Share link' })).toHaveCount(0);

    await friend.getByRole('button', { name: 'Play 33 Seconds' }).click();
    await expect(friend.getByRole('button', { name: 'Launch' })).toBeVisible();
    expect(new URL(friend.url()).hash).toBe('');
  });

  test('a loss says so in words, copies an image, and Retry returns to the title', async ({ page }) => {
    await simulate(page, 'lose');
    const result = page.getByTestId('result-lost');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Fleet lost');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeFocused();

    await page.getByRole('button', { name: 'Copy image' }).click();
    await expect(page.getByRole('status')).toHaveText(/Image copied\.|Image saved/);

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByRole('button', { name: 'Launch' })).toBeVisible();
  });

  test('a tampered link opens the title instead', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Simulate win' }).click();
    await page.getByRole('button', { name: 'Share link' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    // One character changed, the way a hand edit would.
    const last = link.at(-1) === 'A' ? 'B' : 'A';
    await page.goto(link.slice(0, -1) + last);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Launch' })).toBeVisible();
    await expect(page.getByTestId('shared-result')).toHaveCount(0);
  });
});
