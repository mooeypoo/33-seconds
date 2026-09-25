import { describe, expect, it } from 'vitest';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import type { CycleProfile } from '../src/domain/balance/profile';
import { createGame, type Game } from '../src/domain/game';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

/**
 * The swarm override (ADR-0001 D9): numbers the application sets between ticks that win over the
 * tier's per-cycle ramps, in the middle of a cycle, until cleared. The Training Run's drills use it.
 */
const BUSY: CycleProfile = {
  ...DEFAULT_CYCLE_PROFILE,
  directorCap: [4],
  swarmFloor: [4],
  attackTokens: [2],
  strafeTokens: [1],
  heavyFromCycle: 0,
};

function run(game: Game, seconds: number, intent = IDLE_INTENT): DomainEvent[] {
  const events: DomainEvent[] = [];
  for (let i = 0; i < seconds * TICKS_PER_SECOND; i++) events.push(...game.tick(intent));
  return events;
}

function cylonShots(events: readonly DomainEvent[]): number {
  return events.filter((event) => event.type === 'ShotFired' && event.owner === 'cylon').length;
}

describe('the swarm override', () => {
  it('holds the swarm to its own cap and keeps every Raider from firing or strafing', () => {
    const game = createGame({ seed: 4, tierProfile: BUSY });
    game.setSwarmOverride({ cap: 1, floor: 0, attackTokens: 0, strafeTokens: 0 });

    let most = 0;
    let strafed = false;
    const events: DomainEvent[] = [];
    for (let i = 0; i < 20 * TICKS_PER_SECOND; i++) {
      events.push(...game.tick(IDLE_INTENT));
      most = Math.max(most, game.view.raiders.length);
      strafed ||= game.view.raiders.some((raider) => raider.strafing);
    }

    expect(most).toBe(1);
    expect(cylonShots(events)).toBe(0);
    expect(strafed).toBe(false);
    expect(events.some((event) => event.type === 'FleetHit')).toBe(false);
  });

  it('takes effect in the middle of a cycle, and null hands the swarm back to the ramps', () => {
    const game = createGame({ seed: 4, tierProfile: BUSY });
    game.setSwarmOverride({ cap: 1, attackTokens: 0 });
    expect(cylonShots(run(game, 5))).toBe(0);
    const cycle = game.view.cycle.cycleIndex;

    game.setSwarmOverride({ cap: 3, floor: 3, attackTokens: 1 });
    const live = run(game, 5);
    expect(game.view.cycle.cycleIndex).toBe(cycle);
    expect(game.view.raiders).toHaveLength(3);
    expect(cylonShots(live)).toBeGreaterThan(0);

    game.setSwarmOverride(null);
    run(game, 1);
    expect(game.view.raiders).toHaveLength(4);
  });

  it('leaves a field it does not set on the ramp', () => {
    const game = createGame({ seed: 4, tierProfile: BUSY });
    game.setSwarmOverride({ attackTokens: 0 });
    const events = run(game, 5);

    expect(game.view.raiders).toHaveLength(4);
    expect(cylonShots(events)).toBe(0);
  });

  it('uses its own floor: with none, a pending download keeps its slot after a kill', () => {
    const game = createGame({ seed: 1, raidersFire: false, tierProfile: BUSY });
    game.setSwarmOverride({ cap: 3, floor: 0 });
    game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(3);

    const before = game.view.kills;
    for (let i = 0; i < 12 * TICKS_PER_SECOND && game.view.kills === before; i++) {
      const viperX = game.view.viper.x;
      const target = [...game.view.raiders].sort((a, b) => Math.abs(a.x - viperX) - Math.abs(b.x - viperX))[0];
      game.tick({ ...IDLE_INTENT, moveX: Math.max(-1, Math.min(1, ((target?.x ?? viperX) - viperX) / 20)) });
    }
    game.tick(IDLE_INTENT);

    expect(game.view.ghosts).toHaveLength(1);
    expect(game.view.raiders).toHaveLength(2);
  });

  it('never drops Raiders that are already alive when the cap falls', () => {
    const game = createGame({ seed: 4, tierProfile: BUSY, raidersFire: false });
    run(game, 1);
    expect(game.view.raiders).toHaveLength(4);

    game.setSwarmOverride({ cap: 1, floor: 0 });
    const events = run(game, 1);
    expect(game.view.raiders).toHaveLength(4);
    expect(events.some((event) => event.type === 'RaiderDestroyed')).toBe(false);
  });

  it('repeats exactly from the same seed when set at the same tick', () => {
    function replay(): number[] {
      const game = createGame({ seed: 9, tierProfile: BUSY });
      run(game, 3);
      game.setSwarmOverride({ cap: 2, attackTokens: 1, strafeTokens: 0 });
      run(game, 6);
      return game.view.raiders.map((raider) => raider.x);
    }
    expect(replay()).toEqual(replay());
  });
});
