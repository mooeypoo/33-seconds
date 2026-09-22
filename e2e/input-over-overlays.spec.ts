import { expect, test } from '@playwright/test';
import { dragFrom, expectViperToMove, releaseDrag, startRun, viperPosition } from './helpers';

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
    await expectViperToMove(page, 'fly up and to the left', (now) => now.x < before.x && now.y < before.y);
    await releaseDrag(page);
  });

  test('a drag that starts on the debug readout still steers', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    // The readout is part of the HUD layer, which must be transparent to pointer input.
    const readout = (await page.getByTestId('debug').boundingBox())!;
    await dragFrom(page, { x: readout.x + readout.width / 2, y: readout.y + readout.height / 2 }, 70, 90);
    await expectViperToMove(page, 'fly down and to the right', (now) => now.x > before.x && now.y > before.y);
    await releaseDrag(page);
  });

  test('a drag that starts on the pause button does not steer', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    const box = (await page.getByRole('button', { name: 'Pause' }).boundingBox())!;
    await dragFrom(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -80, 80);
    // Long enough that a stick which had engaged would have moved the Viper a long way.
    await page.waitForTimeout(700);
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

  test('a touch device is told to drag, until it does', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The hint is for touch devices; desktop players get the key list.');
    await startRun(page);

    const hint = page.getByText('Drag anywhere to fly');
    await expect(hint).toBeVisible();

    const viewport = page.viewportSize()!;
    await dragFrom(page, { x: viewport.width / 2, y: viewport.height / 2 }, 0, -40);
    await releaseDrag(page);

    // It has served its purpose and does not come back in this run.
    await expect(hint).toBeHidden();
  });

  test('the drag hint stays gone after a later run', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The hint is for touch devices; desktop players get the key list.');
    await startRun(page);

    const viewport = page.viewportSize()!;
    await dragFrom(page, { x: viewport.width / 2, y: viewport.height / 2 }, 0, -40);
    await releaseDrag(page);
    await expect(page.getByText('Drag anywhere to fly')).toBeHidden();

    await startRun(page);
    await expect(page.getByText('Drag anywhere to fly')).toBeHidden();
  });

  test('a drag that starts on a comms line still steers', async ({ page }) => {
    await startRun(page);
    const comms = page.getByTestId('comms');
    await expect(comms).toBeVisible();
    await expect(comms).toContainText('Adama');

    const before = await viperPosition(page);
    const box = (await comms.boundingBox())!;
    await dragFrom(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 70, 40);
    await expectViperToMove(page, 'fly when the drag starts on comms', (now) => now.x !== before.x || now.y !== before.y);
    await releaseDrag(page);
  });

  test('the keyboard steers too, by physical key position', async ({ page }) => {
    await startRun(page);
    const before = await viperPosition(page);

    await page.keyboard.down('KeyD');
    await expectViperToMove(page, 'fly right on D', (now) => now.x > before.x);
    await page.keyboard.up('KeyD');
    const afterRight = await viperPosition(page);

    await page.keyboard.down('ArrowUp');
    await expectViperToMove(page, 'fly up on the up arrow', (now) => now.y < afterRight.y);
    await page.keyboard.up('ArrowUp');
  });

  test('the missile button fires one round and does not steal the stick', async ({ page }) => {
    await startRun(page);
    await expect(page.getByTestId('missiles')).toHaveText('3/3');

    await page.getByTestId('fire-missile').click();
    await expect.poll(async () => page.getByTestId('missiles').textContent(), {
      message: 'ammo should drop after one press',
      timeout: 10_000,
    }).toBe('2/3');

    const before = await viperPosition(page);
    const box = (await page.getByTestId('fire-missile').boundingBox())!;
    await dragFrom(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, -80, -80);
    await page.waitForTimeout(700);
    const after = await viperPosition(page);
    await releaseDrag(page);
    expect(after).toEqual(before);
  });

  test('the speech button starts The Speech', async ({ page }) => {
    await startRun(page);
    await expect(page.getByTestId('speech')).toHaveText('ready');

    await page.getByTestId('fire-special').click();
    await expect.poll(async () => page.getByTestId('speech').textContent(), {
      message: 'speech should be talking after one press',
      timeout: 10_000,
    }).toBe('talking');
    await expect(page.getByTestId('speech-banner')).toBeVisible();
  });
});
