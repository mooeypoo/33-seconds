import { describe, expect, it } from 'vitest';
import { parseTierProfile, TierProfileError } from '../src/balance/profileSchema';
import { TIER_PROFILES } from '../src/balance/tiers';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import { rampAt } from '../src/domain/balance/profile';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import { createGame } from '../src/domain/game';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

describe('tier profiles as data', () => {
  it('loads both tiers from tiers.json', () => {
    expect(TIER_PROFILES['civilian-ship'].id).toBe('civilian-ship');
    expect(TIER_PROFILES['viper-pilot'].fleetCycleDamageCap).toBeGreaterThan(0);
  });

  it('names every problem in a bad profile, not just the first', () => {
    const bad = {
      fleetCycleDamageCap: 0,
      fleetRepairOfMissing: 1.5,
      directorCap: [],
      swarmFloor: [0],
      downloadJitterSeconds: 0,
      attackTokens: [1, 2.5],
      strafeTokens: [1],
      spawnRate: 3,
    };
    let caught: TierProfileError | null = null;
    try {
      parseTierProfile('viper-pilot', bad);
    } catch (error) {
      if (error instanceof TierProfileError) caught = error;
    }
    expect(caught?.problems).toHaveLength(5);
    expect(caught?.message).toContain('attackTokens[1] (cycle 2)');
    expect(caught?.message).toContain('spawnRate is not a known setting');
  });

  it('holds the last value of a ramp for every later cycle', () => {
    expect(rampAt([3, 4, 6], 1)).toBe(3);
    expect(rampAt([3, 4, 6], 3)).toBe(6);
    expect(rampAt([3, 4, 6], 9)).toBe(6);
  });

  it('grows the swarm when the Director cap ramps up', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      viperFires: false,
      tierProfile: { ...DEFAULT_CYCLE_PROFILE, directorCap: [2, 4] },
    });
    game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(2);

    for (let i = 0; i < (CYCLE_COMBAT_SECONDS + JUMPING_SECONDS) * TICKS_PER_SECOND; i++) game.tick(IDLE_INTENT);
    game.continueFromJump();
    expect(game.view.cycle.cycleIndex).toBe(2);
    expect(game.view.raiders).toHaveLength(4);
  });
});
