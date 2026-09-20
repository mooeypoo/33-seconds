import { expect, type Page } from '@playwright/test';

/**
 * The debug readout is how these tests observe the simulation: no test-only hook is added to the
 * game, so what the tests drive is exactly what a player drives.
 */
export async function viperPosition(page: Page): Promise<{ x: number; y: number }> {
  const x = await page.getByTestId('viper-x').textContent();
  const y = await page.getByTestId('viper-y').textContent();
  return { x: Number(x), y: Number(y) };
}

export async function startRun(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Launch' }).click();
  // The readout only appears once the loop is running.
  await expect(page.getByTestId('debug')).toBeVisible();
}

/** Drags from a point, in steps, so the adapter sees real pointermove events. */
export async function dragFrom(page: Page, from: { x: number; y: number }, byX: number, byY: number): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(from.x + (byX * step) / 5, from.y + (byY * step) / 5);
    await page.waitForTimeout(40);
  }
}

export async function releaseDrag(page: Page): Promise<void> {
  await page.mouse.up();
}

/** Waits for the readout to settle, which it does a few times a second. */
export async function nextReadout(page: Page): Promise<void> {
  await page.waitForTimeout(350);
}
