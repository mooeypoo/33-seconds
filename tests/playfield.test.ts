import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { DESKTOP_PLAYFIELD, PHONE_PLAYFIELD, WORLD_HEIGHT_UNITS } from '../src/domain/shared/world';
import { playfieldForLane } from '../src/application/playfield';
import { VIPER_HALF_HEIGHT_UNITS, VIPER_HALF_WIDTH_UNITS } from '../src/domain/combat/viper';

describe('a desktop lane', () => {
  it('keeps the same seed on the same playfield, and a different lane is a different scenario', () => {
    const first = createGame({ seed: 4, raidersFire: false, playfield: DESKTOP_PLAYFIELD });
    const second = createGame({ seed: 4, raidersFire: false, playfield: DESKTOP_PLAYFIELD });
    const phone = createGame({ seed: 4, raidersFire: false, playfield: PHONE_PLAYFIELD });

    first.tick(IDLE_INTENT);
    second.tick(IDLE_INTENT);
    phone.tick(IDLE_INTENT);

    expect(first.view.raiders.map((raider) => raider.x)).toEqual(second.view.raiders.map((raider) => raider.x));
    expect(phone.view.raiders.map((raider) => raider.x)).not.toEqual(first.view.raiders.map((raider) => raider.x));
  });

  it('spreads the same ten hulls across the wider lane and lets the Viper reach the new edge', () => {
    const phone = createGame({ seed: 1, raidersFire: false, playfield: PHONE_PLAYFIELD });
    const desktop = createGame({ seed: 1, raidersFire: false, playfield: DESKTOP_PLAYFIELD });
    phone.tick(IDLE_INTENT);
    desktop.tick(IDLE_INTENT);

    const phoneFleet = phone.view.fleet.ships;
    const desktopFleet = desktop.view.fleet.ships;
    expect(desktopFleet).toHaveLength(phoneFleet.length);
    expect(desktopFleet[9]?.x).toBeGreaterThan(phoneFleet[9]?.x ?? 0);
    expect(desktop.view.worldWidth).toBe(DESKTOP_PLAYFIELD.width);
    expect(desktop.view.fighterScale).toBe(DESKTOP_PLAYFIELD.fighterScale);

    for (let i = 0; i < TICKS_PER_SECOND * 10; i++) desktop.tick({ ...IDLE_INTENT, moveX: 1, moveY: 1 });

    expect(desktop.view.viper.x).toBe(DESKTOP_PLAYFIELD.width - VIPER_HALF_WIDTH_UNITS * DESKTOP_PLAYFIELD.fighterScale);
    expect(desktop.view.viper.y).toBe(WORLD_HEIGHT_UNITS - VIPER_HALF_HEIGHT_UNITS * DESKTOP_PLAYFIELD.fighterScale);
    expect(desktop.view.viper.scale).toBe(DESKTOP_PLAYFIELD.fighterScale);
  });
});

describe('a phone lane fitted to the screen', () => {
  it('keeps the 9:16 world on a tall lane, widens it on a squat one, and stops at the desktop width', () => {
    expect(playfieldForLane(360, 640).width).toBe(PHONE_PLAYFIELD.width);
    expect(playfieldForLane(360, 900).width).toBe(PHONE_PLAYFIELD.width);
    expect(playfieldForLane(300, 480).width).toBe(300);
    // A Pixel 7 with comms on top: 412 x 592 would be 334 units, past anything balanced.
    expect(playfieldForLane(412, 592).width).toBe(DESKTOP_PLAYFIELD.width);
  });

  it('never makes the world wider than the lane can show at full height', () => {
    for (let widthPx = 200; widthPx <= 500; widthPx += 7) {
      for (let heightPx = 300; heightPx <= 1000; heightPx += 11) {
        const { width } = playfieldForLane(widthPx, heightPx);
        if (width > PHONE_PLAYFIELD.width) {
          expect(width * (heightPx / WORLD_HEIGHT_UNITS), `${String(widthPx)} x ${String(heightPx)}`).toBeLessThanOrEqual(widthPx);
        }
      }
    }
  });

  it('falls back to the phone world when the lane has no size yet', () => {
    expect(playfieldForLane(0, 600)).toEqual(PHONE_PLAYFIELD);
    expect(playfieldForLane(400, 0)).toEqual(PHONE_PLAYFIELD);
    expect(playfieldForLane(Number.NaN, 600)).toEqual(PHONE_PLAYFIELD);
  });

  it('plays an in-between width: the Viper reaches its edge and Raiders stay inside it', () => {
    const playfield = { width: 297, fighterScale: 1 };
    const game = createGame({ seed: 7, playfield });
    for (let i = 0; i < TICKS_PER_SECOND * 20; i++) {
      game.tick({ ...IDLE_INTENT, moveX: 1 });
      for (const raider of game.view.raiders) {
        expect(raider.x).toBeGreaterThanOrEqual(0);
        expect(raider.x).toBeLessThanOrEqual(playfield.width);
      }
    }
    expect(game.view.viper.x).toBe(playfield.width - VIPER_HALF_WIDTH_UNITS);
    expect(game.view.fleet.ships.at(-1)?.x).toBeLessThan(playfield.width);
  });
});
