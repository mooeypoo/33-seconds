import { describe, expect, it } from 'vitest';
import { TIER_PROFILES } from '../src/balance/tiers';
import { rampAt } from '../src/domain/balance/profile';
import { GameSession } from '../src/application/GameSession';
import { createGame } from '../src/domain/game';
import { CONTINUITY_CAP_PER_STACK } from '../src/domain/progression/catalog';
import { Loadout } from '../src/domain/progression/loadout';
import {
  FLEET_CYCLE_DAMAGE_CAP,
  FLEET_DAMAGE_PER_STRAFE,
  FLEET_INTEGRITY_MAX,
  FLEET_REPAIR_OF_MISSING,
  Fleet,
} from '../src/domain/fleet/integrity';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import type { InputPort } from '../src/application/ports/InputPort';

const quietInput: InputPort = {
  readIntent: () => IDLE_INTENT,
  clear: () => {},
};

function drainToCap(fleet: Fleet, cap: number): void {
  for (let i = 0; i < cap + 5; i++) fleet.takeStray(135, cap);
}

describe('tier profiles', () => {
  it('keeps createGame on Civilian Run numbers when no profile is passed', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(game.view.tier).toBe('civilian-ship');
  });

  it('Civilian Run never dies from cap-and-repair', () => {
    const fleet = new Fleet();
    for (let cycle = 0; cycle < 8; cycle++) {
      drainToCap(fleet, FLEET_CYCLE_DAMAGE_CAP);
      expect(fleet.view.integrity).toBeGreaterThan(0);
      fleet.repairAtJump(FLEET_REPAIR_OF_MISSING);
    }
    expect(fleet.view.integrity).toBeGreaterThan(40);
  });

  it('Viper Pilot is lost on the fifth full-cap cycle', () => {
    const profile = TIER_PROFILES['viper-pilot'];
    const fleet = new Fleet();
    for (let cycle = 1; cycle <= 4; cycle++) {
      drainToCap(fleet, profile.fleetCycleDamageCap);
      expect(fleet.view.integrity).toBeGreaterThan(0);
      fleet.repairAtJump(rampAt(profile.fleetRepairOfMissing, cycle));
    }
    drainToCap(fleet, profile.fleetCycleDamageCap);
    expect(fleet.view.integrity).toBe(0);
  });

  it('Continuity of Government multiplies the Viper Pilot cap', () => {
    expect(new Loadout(['continuity-of-government'], 45).fleetCycleDamageCap).toBeCloseTo(
      45 * CONTINUITY_CAP_PER_STACK,
    );
  });

  it('Launch defaults to Viper Pilot, and Civilian Run is a choice', () => {
    const pilot = new GameSession(quietInput);
    pilot.start();
    expect(pilot.view.tier).toBe('viper-pilot');

    const civilian = new GameSession(quietInput);
    civilian.start('civilian-ship');
    expect(civilian.view.tier).toBe('civilian-ship');
  });

  it('still ends a Viper Pilot run when the pool is already thin', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      viperFires: false,
      fleetStartingIntegrity: FLEET_DAMAGE_PER_STRAFE,
      tierProfile: TIER_PROFILES['viper-pilot'],
    });
    let lost = false;
    for (let i = 0; i < 12 * 60; i++) {
      if (game.tick(IDLE_INTENT).some((event) => event.type === 'RunLost')) {
        lost = true;
        expect(game.view.fleet.integrity).toBe(0);
        break;
      }
    }
    expect(lost).toBe(true);
    expect(game.view.fleet.integrityMax).toBe(FLEET_INTEGRITY_MAX);
  });
});
