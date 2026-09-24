import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { DESKTOP_PLAYFIELD, PHONE_PLAYFIELD, WORLD_HEIGHT_UNITS } from '../src/domain/shared/world';
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
