import { expect, type Page } from '@playwright/test';

/**
 * The debug readout is how these tests observe the simulation: no test-only hook is added to the
 * game, so what the tests drive is exactly what a player drives.
 *
 * Everything here polls rather than sleeping. The readout refreshes a few times a second, and under
 * a loaded CI machine the game legitimately runs slower than real time (the loop drops backlog
 * instead of catching up), so any fixed wait is a race waiting to happen.
 */
export async function viperPosition(page: Page): Promise<{ x: number; y: number }> {
  const x = await page.getByTestId('viper-x').textContent();
  const y = await page.getByTestId('viper-y').textContent();
  return { x: Number(x), y: Number(y) };
}

export async function startRun(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Launch' }).click();
  // The readout only appears once the loop is running and has published once.
  // Present in the test build. On a phone it is not shown, so visibility is the wrong check.
  await expect(page.getByTestId('viper-x')).toBeAttached();
}

/** Presses a pointer down and drags in steps, leaving the pointer down for the caller to release. */
export async function dragFrom(page: Page, from: { x: number; y: number }, byX: number, byY: number): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(from.x + (byX * step) / 5, from.y + (byY * step) / 5);
  }
}

export async function releaseDrag(page: Page): Promise<void> {
  await page.mouse.up();
}

/**
 * Waits until the Viper has moved the way the caller describes, with the input still held.
 *
 * @param description what should happen, for the failure message
 * @param hasMoved true once the readout shows it
 */
export async function expectViperToMove(
  page: Page,
  description: string,
  hasMoved: (position: { x: number; y: number }) => boolean,
): Promise<void> {
  await expect
    .poll(async () => hasMoved(await viperPosition(page)), { message: `Viper should ${description}`, timeout: 10_000 })
    .toBe(true);
}

/** Waits until the simulation has advanced past a known tick count. */
export async function expectTicksToGrow(page: Page, beyond: number): Promise<void> {
  await expect
    .poll(async () => readTicks(page), { message: `ticks should pass ${String(beyond)}`, timeout: 10_000 })
    .toBeGreaterThan(beyond);
}

/** Reads the tick count out of the debug readout. */
export async function readTicks(page: Page): Promise<number> {
  const text = (await page.getByTestId('debug').textContent()) ?? '';
  const match = /(\d+) ticks/.exec(text);
  return match ? Number(match[1]) : -1;
}
