import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { Projectile } from '../src/domain/combat/projectile';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import {
  CIVILIAN_SHIP_COUNT,
  FLEET_CYCLE_DAMAGE_CAP,
  FLEET_DAMAGE_PER_STRAY,
  FLEET_INTEGRITY_MAX,
  FLEET_LINE_Y_UNITS,
  FLEET_REPAIR_OF_MISSING,
  Fleet,
  civilianShipX,
} from '../src/domain/fleet/integrity';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function run(game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) game.tick(IDLE_INTENT);
}

describe('Fleet Integrity', () => {
  it('starts full, and a stray takes a point off it', () => {
    const fleet = new Fleet();
    expect(fleet.view.integrity).toBe(FLEET_INTEGRITY_MAX);
    expect(fleet.takeStray()).toBe(FLEET_DAMAGE_PER_STRAY);
    expect(fleet.view.integrity).toBe(FLEET_INTEGRITY_MAX - FLEET_DAMAGE_PER_STRAY);
  });

  it('will not take more than the per-cycle cap, even if strays keep coming', () => {
    const fleet = new Fleet();
    let applied = 0;
    for (let i = 0; i < FLEET_CYCLE_DAMAGE_CAP + 20; i++) applied += fleet.takeStray();
    expect(applied).toBe(FLEET_CYCLE_DAMAGE_CAP);
    expect(fleet.view.integrity).toBe(FLEET_INTEGRITY_MAX - FLEET_CYCLE_DAMAGE_CAP);
    expect(fleet.takeStray()).toBe(0);
  });

  it('repairs a fraction of what is missing at the jump, then the cap resets', () => {
    const fleet = new Fleet();
    for (let i = 0; i < 20; i++) fleet.takeStray();
    const missing = FLEET_INTEGRITY_MAX - fleet.view.integrity;
    fleet.repairAtJump();
    expect(fleet.view.integrity).toBeCloseTo(FLEET_INTEGRITY_MAX - missing * (1 - FLEET_REPAIR_OF_MISSING));
    expect(fleet.takeStray()).toBe(FLEET_DAMAGE_PER_STRAY);
  });

  it('never drops below zero, and never repairs above full', () => {
    const fleet = new Fleet();
    for (let i = 0; i < 200; i++) fleet.takeStray();
    expect(fleet.view.integrity).toBe(FLEET_INTEGRITY_MAX - FLEET_CYCLE_DAMAGE_CAP);
    fleet.repairAtJump();
    expect(fleet.view.integrity).toBeLessThanOrEqual(FLEET_INTEGRITY_MAX);
    const full = new Fleet();
    full.repairAtJump();
    expect(full.view.integrity).toBe(FLEET_INTEGRITY_MAX);
  });

  it('puts ten hulls on the line, and a stray marks the nearest one', () => {
    const fleet = new Fleet();
    expect(fleet.view.ships).toHaveLength(CIVILIAN_SHIP_COUNT);
    expect(fleet.view.ships.every((ship) => ship.healthy && !ship.justHit)).toBe(true);

    expect(fleet.takeStray(civilianShipX(0))).toBe(FLEET_DAMAGE_PER_STRAY);
    expect(fleet.view.lastHitShipId).toBe(0);
    expect(fleet.view.ships[0]?.justHit).toBe(true);
    expect(fleet.view.ships[9]?.justHit).toBe(false);

    fleet.takeStray(civilianShipX(9));
    expect(fleet.view.lastHitShipId).toBe(9);
    expect(fleet.view.ships[9]?.justHit).toBe(true);
    expect(fleet.view.ships[0]?.justHit).toBe(false);
  });

  it('dings a hull once enough integrity is gone, and the jump clears the hit mark', () => {
    const fleet = new Fleet();
    for (let i = 0; i < 6; i++) fleet.takeStray(civilianShipX(0));
    expect(fleet.view.ships.filter((ship) => ship.healthy)).toHaveLength(9);
    expect(fleet.view.lastHitShipId).toBe(0);
    fleet.repairAtJump();
    expect(fleet.view.lastHitShipId).toBeNull();
    expect(fleet.view.ships.every((ship) => !ship.justHit)).toBe(true);
  });
});

describe('a stray crossing the fleet line', () => {
  it('counts when the round leaps the line in one tick', () => {
    const shot = new Projectile();
    shot.revive(1, 40, FLEET_LINE_Y_UNITS - 30, 0, 200, 'cylon');
    shot.becomeStrayIfPast(0);
    shot.advance(1);
    expect(shot.crossedFleetLine(FLEET_LINE_Y_UNITS)).toBe(true);
  });

  it('does not count an aimed round that has not passed the Viper', () => {
    const shot = new Projectile();
    shot.revive(1, 40, FLEET_LINE_Y_UNITS - 30, 0, 200, 'cylon');
    shot.advance(1);
    expect(shot.crossedFleetLine(FLEET_LINE_Y_UNITS)).toBe(false);
  });

  it('does not count a player round', () => {
    const shot = new Projectile();
    shot.revive(1, 40, FLEET_LINE_Y_UNITS - 30, 0, 200, 'player');
    shot.advance(1);
    expect(shot.crossedFleetLine(FLEET_LINE_Y_UNITS)).toBe(false);
  });
});

describe('strays in a run', () => {
  it('dents the fleet when a Cylon round misses you and crosses the line', () => {
    const game = createGame({ seed: 1 });
    let hit = false;
    for (let i = 0; i < ticksFor(12); i++) {
      // Hold the left edge so some aimed shots miss and become strays.
      const events = game.tick({ ...IDLE_INTENT, moveX: -1, moveY: 0 });
      for (const event of events) {
        if (event.type !== 'FleetHit') continue;
        hit = true;
        expect(event.shipId).toBeGreaterThanOrEqual(0);
        expect(event.shipId).toBeLessThan(CIVILIAN_SHIP_COUNT);
        break;
      }
      if (hit) break;
    }
    expect(hit).toBe(true);
    expect(game.view.fleet.integrity).toBeLessThan(FLEET_INTEGRITY_MAX);
  });

  it('repairs at the jump', () => {
    const game = createGame({ seed: 1 });
    const park = { ...IDLE_INTENT, moveX: -1, moveY: 0 };
    let lastCombatIntegrity = FLEET_INTEGRITY_MAX;
    let repairedTo: number | null = null;
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS) + 2; i++) {
      const events = game.tick(park);
      if (game.view.cycle.phase !== 'jumping') lastCombatIntegrity = game.view.fleet.integrity;
      for (const event of events) {
        if (event.type === 'FleetRepaired') repairedTo = event.integrity;
      }
    }
    expect(game.view.cycle.phase).toBe('jumping');
    expect(lastCombatIntegrity).toBeLessThan(FLEET_INTEGRITY_MAX);
    expect(repairedTo).toBeGreaterThan(lastCombatIntegrity);
    run(game, ticksFor(JUMPING_SECONDS));
    expect(game.view.cycle.phase).toBe('recovering');
    expect(game.view.fleet.integrity).toBeLessThanOrEqual(FLEET_INTEGRITY_MAX);
  });
});
