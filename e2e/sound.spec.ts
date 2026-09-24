import { expect, test, type Page } from '@playwright/test';
import { hudButton, startRun } from './helpers';

/**
 * Sound is never a surprise (PRD 14.1). Playwright cannot hear, so these check the promises around
 * sound: no audio context before Launch, and a mute that is findable, labeled, and remembered.
 */

/** Counts every AudioContext the page creates, before any of the game's code runs. */
async function countAudioContexts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const counted = window as unknown as { audioContexts: number };
    counted.audioContexts = 0;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor(options?: AudioContextOptions) {
        super(options);
        counted.audioContexts += 1;
      }
    };
  });
}

function audioContexts(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { audioContexts: number }).audioContexts);
}

test.describe('sound', () => {
  test('creates no audio context until Launch, even after other taps on the title', async ({ page }) => {
    await countAudioContexts(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'How to fly' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Mute' }).click();
    await page.getByRole('button', { name: 'Unmute' }).click();
    expect(await audioContexts(page)).toBe(0);

    await page.getByRole('button', { name: 'Launch' }).click();
    await expect.poll(() => audioContexts(page)).toBeGreaterThan(0);
  });

  test('the title offers mute beside the sound notice: labeled, large enough, and remembered', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('This game has sound.', { exact: false })).toBeVisible();
    const mute = page.getByRole('button', { name: 'Mute' });
    await expect(mute).toBeVisible();
    await expect(mute).toHaveText('Sound on');
    const box = (await mute.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await mute.click();
    await expect(page.getByRole('button', { name: 'Unmute' })).toHaveText('Muted');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
  });

  test('mute is one tap from the HUD, and the pause menu has mute and a volume in words', async ({ page }) => {
    await startRun(page);
    const hudMute = await hudButton(page, 'Mute');
    await hudMute.click();
    await expect(page.getByRole('button', { name: 'Unmute' }).first()).toHaveText('Muted');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    const pauseMenu = page.locator('.overlay');
    await expect(pauseMenu.getByRole('button', { name: 'Unmute' })).toBeVisible();

    const volume = pauseMenu.getByRole('slider', { name: /Volume/ });
    await expect(pauseMenu.getByText('Volume 70%')).toBeVisible();
    await volume.fill('35');
    await expect(pauseMenu.getByText('Volume 35%')).toBeVisible();

    await page.reload();
    await startRun(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay').getByText('Volume 35%')).toBeVisible();
  });
});
