import { expect, test } from '@playwright/test';
import { dragFrom, nextReadout, releaseDrag, startRun, viperPosition } from './helpers';

/**
 * The input matrix from ADR-0001 D6. This is the test that protects against a future overlay
 * silently swallowing touches, which would make the game unplayable on a phone in a way that is
 * very easy to ship and very hard to notice.
 */
test.describe('steering works wherever the finger lands', () => {
  test('a drag over the canvas steers the Viper', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    // Start well away from the HUD corners, in the middle of the play area.
    const viewport = page.viewportSize()!;
    await dragFrom(page, { x: viewport.width / 2, y: viewport.height / 2 }, -60, -60);
    await nextReadout(page);
    const after = await viperPosition(page);
    await releaseDrag(page);

    expect(after.x).toBeLessThan(before.x);
    expect(after.y).toBeLessThan(before.y);
  });

  test('a drag that starts on the debug readout still steers', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    // The readout is part of the HUD layer, which must be transparent to pointer input.
    const readout = await page.getByTestId('debug').boundingBox();
    await dragFrom(page, { x: readout!.x + readout!.width / 2, y: readout!.y + readout!.height / 2 }, 70, 90);
    await nextReadout(page);
    const after = await viperPosition(page);
    await releaseDrag(page);

    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
  });

  test('a drag that starts on the pause button does not steer', async ({ page }) => {
    await startRun(page);
    await nextReadout(page);
    const before = await viperPosition(page);

    const box = (await page.getByRole('button', { name: 'Pause' }).boundingBox())!;
    await dragFrom(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -80, 80);
    await nextReadout(page);
    const after = await viperPosition(page);
    await releaseDrag(page);

    // A touch that lands on a real control is a button press, never the stick (ADR-0001 D6).
    expect(after).toEqual(before);
  });

  test('tapping the pause button pauses', async ({ page }) => {
    await startRun(page);

    await page.getByRole('button', { name: 'Pause' }).click();

    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  });

  test('the keyboard steers too, by physical key position', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    await page.keyboard.down('KeyD');
    await nextReadout(page);
    await page.keyboard.up('KeyD');
    const afterRight = await viperPosition(page);

    expect(afterRight.x).toBeGreaterThan(before.x);

    await page.keyboard.down('ArrowUp');
    await nextReadout(page);
    await page.keyboard.up('ArrowUp');

    expect((await viperPosition(page)).y).toBeLessThan(afterRight.y);
  });
});
