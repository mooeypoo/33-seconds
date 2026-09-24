import { describe, expect, it } from 'vitest';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import type { CycleProfile } from '../src/domain/balance/profile';
import { MISSILE_HEAVY_DAMAGE } from '../src/domain/combat/missile';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import { createGame, HEAVY_FIRST_ARRIVAL_SECONDS, HEAVY_INTERVAL_SECONDS, type Game, type GameOptions } from '../src/domain/game';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { HEAVY_HIT_POINTS } from '../src/domain/swarm/raider';

/** The heavy Raider: its own queue, its own token, no downloads (ADR-0002 3.3). */
function heavyGame(overrides: Partial<CycleProfile>, options: GameOptions = {}): Game {
  return createGame({
    seed: 4,
    raidersFire: false,
    viperFires: false,
    ...options,
    tierProfile: { ...DEFAULT_CYCLE_PROFILE, heavyFromCycle: 1, heavyPerCycle: 1, heavyMax: 2, ...overrides },
  });
}

function run(game: Game, seconds: number, intent: InputIntent = IDLE_INTENT): DomainEvent[] {
  const events: DomainEvent[] = [];
  for (let i = 0; i < Math.round(seconds * TICKS_PER_SECOND); i++) events.push(...game.tick(intent));
  return events;
}

function heavies(game: Game): number {
  return game.view.raiders.filter((raider) => raider.kind === 'heavy').length;
}

function toNextCycle(game: Game): void {
  while (game.view.cycle.phase !== 'recovering') game.tick(IDLE_INTENT);
  game.continueFromJump();
}

describe('the heavy Raider', () => {
  it('arrives 8 seconds into its first cycle, not before, and not in earlier cycles', () => {
    const early = heavyGame({ heavyFromCycle: 2 });
    run(early, CYCLE_COMBAT_SECONDS - 1);
    expect(heavies(early)).toBe(0);

    const game = heavyGame({});
    run(game, HEAVY_FIRST_ARRIVAL_SECONDS - 0.5);
    expect(heavies(game)).toBe(0);
    const arrival = run(game, 1);
    expect(heavies(game)).toBe(1);
    expect(arrival.some((event) => event.type === 'RaiderSpawned' && event.heavy)).toBe(true);
  });

  it('never has more alive than the tier allows, and does not use up the Raider cap', () => {
    const game = heavyGame({ heavyPerCycle: 4, heavyMax: 2, directorCap: [2] });
    for (let cycle = 0; cycle < 2; cycle++) {
      for (let second = 0; second < CYCLE_COMBAT_SECONDS; second++) {
        run(game, 1);
        expect(heavies(game)).toBeLessThanOrEqual(2);
        expect(game.view.raiders.filter((raider) => raider.kind === 'raider').length).toBeLessThanOrEqual(2);
      }
      toNextCycle(game);
    }
    // Two heavies came alongside two Raiders at some point: the heavies did not take Raider slots.
    run(game, HEAVY_FIRST_ARRIVAL_SECONDS + HEAVY_INTERVAL_SECONDS + 0.5);
    expect(heavies(game)).toBe(2);
    expect(game.view.raiders.filter((raider) => raider.kind === 'raider')).toHaveLength(2);
  });

  it('survives a missile, three down, where a Raider would die', () => {
    const game = heavyGame({ directorCap: [1] });
    run(game, HEAVY_FIRST_ARRIVAL_SECONDS + 0.2);
    const heavy = game.view.raiders.find((raider) => raider.kind === 'heavy');
    expect(heavy?.hp).toBe(HEAVY_HIT_POINTS);

    // Line up under it, then one press. Hits the first body on the path, so keep the other clear.
    let hit = false;
    for (let i = 0; i < TICKS_PER_SECOND * 6 && !hit; i++) {
      const target = game.view.raiders.find((raider) => raider.id === heavy?.id);
      const moveX = Math.max(-1, Math.min(1, ((target?.x ?? 0) - game.view.viper.x) / 20));
      const lined = Math.abs((target?.x ?? 0) - game.view.viper.x) < 2 && game.view.missileLock?.id === heavy?.id;
      game.tick({ ...IDLE_INTENT, moveX, missile: lined && i % 2 === 0 });
      hit = (game.view.raiders.find((raider) => raider.id === heavy?.id)?.hp ?? HEAVY_HIT_POINTS) < HEAVY_HIT_POINTS;
    }
    const after = game.view.raiders.find((raider) => raider.id === heavy?.id);
    expect(after?.hp).toBe(HEAVY_HIT_POINTS - MISSILE_HEAVY_DAMAGE);
  });

  it('dies to sustained fire and never downloads', () => {
    const game = heavyGame({}, { viperFires: true });
    run(game, HEAVY_FIRST_ARRIVAL_SECONDS + 0.2);
    const heavy = game.view.raiders.find((raider) => raider.kind === 'heavy');
    expect(heavy?.hpMax).toBe(HEAVY_HIT_POINTS);

    // Sit under it with the gun until it dies.
    let destroyed: DomainEvent | undefined;
    for (let i = 0; i < TICKS_PER_SECOND * 15 && !destroyed; i++) {
      const target = game.view.raiders.find((raider) => raider.id === heavy?.id);
      const moveX = Math.max(-1, Math.min(1, ((target?.x ?? game.view.viper.x) - game.view.viper.x) / 20));
      destroyed = game.tick({ ...IDLE_INTENT, moveX }).find((event) => event.type === 'RaiderDestroyed' && event.id === heavy?.id);
    }
    expect(destroyed?.type === 'RaiderDestroyed' && destroyed.heavy).toBe(true);
    expect(game.view.ghosts.some((ghost) => ghost.identityId === heavy?.identityId)).toBe(false);
  });

  it('carries its own attack token: it fires even when the Raiders have none', () => {
    const game = heavyGame({ attackTokens: [0] }, { raidersFire: true });
    const events = run(game, HEAVY_FIRST_ARRIVAL_SECONDS + 3);
    const heavy = game.view.raiders.find((raider) => raider.kind === 'heavy');
    expect(heavy).toBeDefined();
    const cylonShots = events.filter((event) => event.type === 'ShotFired' && event.owner === 'cylon');
    expect(cylonShots.length).toBeGreaterThan(0);
    for (const shot of cylonShots) {
      if (shot.type === 'ShotFired') expect(Math.abs(shot.x - (heavy?.x ?? 0))).toBeLessThan(1);
    }
  });

  it('leaves at the jump and does not come back as the last wave', () => {
    const game = heavyGame({});
    run(game, HEAVY_FIRST_ARRIVAL_SECONDS + 1);
    expect(heavies(game)).toBe(1);
    run(game, CYCLE_COMBAT_SECONDS + JUMPING_SECONDS);
    expect(heavies(game)).toBe(0);
    expect(game.view.ghosts).toHaveLength(0);
  });
});
