import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectTicksToGrow, readTicks, settledTicks } from './helpers';

const training = JSON.parse(readFileSync(new URL('../src/content/training.json', import.meta.url), 'utf8')) as {
  lessons: { id: string; trigger: string; heading: string }[];
};
const opening = training.lessons.filter((lesson) => lesson.trigger === 'TrainingStarted');

/** The Training Run (PRD 5.5): a lesson holds the clock until it is read, and the button stays on offer. */
test.describe('training', () => {
  test('holds the clock through the opening lessons, then flies, and Esc reads the next lesson', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('training-box')).toHaveClass(/fresh/);
    await page.getByRole('button', { name: 'Training Run' }).click();

    const lesson = page.getByTestId('lesson');
    await expect(lesson.getByRole('heading', { name: opening[0]?.heading ?? '' })).toBeVisible();
    await expect(page.getByTestId('status-sim')).toBeVisible();
    const held = await settledTicks(page);

    for (const step of opening) {
      await expect(lesson).toHaveAttribute('data-lesson-id', step.id);
      expect(await readTicks(page)).toBe(held);
      await lesson.getByRole('button', { name: 'Got it' }).click();
    }

    // The last Got it counts 3-2-1 like any resume, then the fight starts.
    await expect(page.getByTestId('countdown')).toBeVisible();
    await expectTicksToGrow(page, held);

    // The next lesson comes from the fight itself. Esc is Got it, not a way to the pause menu.
    await expect(lesson).toBeVisible({ timeout: 30_000 });
    const firstFight = await lesson.getAttribute('data-lesson-id');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
    await expect
      .poll(async () => ((await lesson.count()) === 0 ? null : await lesson.getAttribute('data-lesson-id')))
      .not.toBe(firstFight);
  });

  test('Leave training goes back to the title from a lesson', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Training Run' }).click();
    await page.getByTestId('lesson').getByRole('button', { name: 'Leave training' }).click();

    await expect(page.getByTestId('lesson')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Training Run' })).toBeVisible();
  });

  test('stays on the title after it is done, without the first-visit push', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'thirty-three:v1:settings',
        JSON.stringify({ version: 1, trainingCompleted: true }),
      );
    });
    await page.goto('/');

    const box = page.getByTestId('training-box');
    await expect(box).toBeVisible();
    await expect(box).not.toHaveClass(/fresh/);
    await expect(page.getByRole('button', { name: 'Training Run' })).toBeVisible();
  });
});
