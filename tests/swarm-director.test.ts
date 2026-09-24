import { describe, expect, it } from 'vitest';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import type { CycleProfile } from '../src/domain/balance/profile';
import { createGame, type Game } from '../src/domain/game';
import type { DomainEvent, RaiderSpawned } from '../src/domain/shared/events';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../src/domain/swarm/resurrection';

/** The Director's floor, cap, staggered downloads, and the last wave (PRD 6, 9; ADR-0002 3.2). */
function profile(overrides: Partial<CycleProfile>): CycleProfile {
  return { ...DEFAULT_CYCLE_PROFILE, ...overrides };
}

function steerUnder(game: Game, x: number): DomainEvent[] {
  const moveX = Math.max(-1, Math.min(1, (x - game.view.viper.x) / 20));
  return [...game.tick({ ...IDLE_INTENT, moveX })];
}

/** Hunts the nearest Raider until one dies. Returns the events of that hunt. */
function killOne(game: Game): DomainEvent[] {
  const before = game.view.kills;
  const events: DomainEvent[] = [];
  for (let i = 0; i < TICKS_PER_SECOND * 12; i++) {
    const viperX = game.view.viper.x;
    const target = [...game.view.raiders].sort((a, b) => Math.abs(a.x - viperX) - Math.abs(b.x - viperX))[0];
    events.push(...steerUnder(game, target?.x ?? viperX));
    if (game.view.kills > before) return events;
  }
  throw new Error('expected a kill');
}

describe('the Director floor', () => {
  it('sends a fresh Raider when a kill leaves the swarm under the floor, even with a download pending', () => {
    const game = createGame({ seed: 1, raidersFire: false, tierProfile: profile({ directorCap: [3], swarmFloor: [3] }) });
    game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(3);

    killOne(game);
    game.tick(IDLE_INTENT);
    expect(game.view.ghosts.length).toBeGreaterThanOrEqual(1);
    expect(game.view.raiders).toHaveLength(3);
  });

  it('keeps the old rule without a floor: a pending download holds its slot', () => {
    const game = createGame({ seed: 1, raidersFire: false, tierProfile: profile({ directorCap: [3], swarmFloor: [0] }) });
    game.tick(IDLE_INTENT);
    killOne(game);
    game.tick(IDLE_INTENT);
    expect(game.view.raiders.length + game.view.ghosts.length).toBe(3);
    expect(game.view.raiders).toHaveLength(2);
  });

  it('holds a finished download at the cap until a kill frees a slot, and that slot goes to the return', () => {
    const game = createGame({ seed: 1, raidersFire: false, tierProfile: profile({ directorCap: [2], swarmFloor: [2] }) });
    game.tick(IDLE_INTENT);
    killOne(game);
    game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(2);

    // Wait out the download with the swarm full: it must not push past the cap.
    for (let i = 0; i < TICKS_PER_SECOND * (RESURRECTION_DOWNLOAD_SECONDS + 1); i++) {
      game.tick(IDLE_INTENT);
      expect(game.view.raiders.length).toBeLessThanOrEqual(2);
    }
    expect(game.view.ghosts.some((ghost) => ghost.remainingSeconds === 0)).toBe(true);

    const next = killOne(game);
    game.tick(IDLE_INTENT);
    const spawned = next.filter((event): event is RaiderSpawned => event.type === 'RaiderSpawned');
    expect(spawned.length).toBeGreaterThan(0);
    expect(spawned.every((event) => event.returned)).toBe(true);
  });
});

describe('the last wave', () => {
  it('tops the swarm up to the cap when the ship dies, then sends nothing fresh', () => {
    // No floor, so a kill leaves a real gap: the pending download holds a slot until the ship dies.
    const game = createGame({
      seed: 1,
      raidersFire: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
      resurrectionShipHitPoints: 1,
      tierProfile: profile({ directorCap: [4], swarmFloor: [0] }),
    });
    game.tick(IDLE_INTENT);
    killOne(game);
    expect(game.view.raiders.length).toBeLessThan(4);

    let destroyed = false;
    for (let i = 0; i < TICKS_PER_SECOND * 10 && !destroyed; i++) {
      const events = steerUnder(game, game.view.resurrectionShip?.x ?? game.view.viper.x);
      destroyed = events.some((event) => event.type === 'ResurrectionShipDestroyed');
    }
    expect(destroyed).toBe(true);
    expect(game.view.raiders).toHaveLength(4);

    const fresh: DomainEvent[] = [];
    for (let kill = 0; kill < 3; kill++) {
      fresh.push(...killOne(game).filter((event) => event.type === 'RaiderSpawned' && !event.returned));
    }
    expect(fresh).toEqual([]);
  });
});

describe('staggered downloads', () => {
  function downloadTimes(jitter: number): number[] {
    const game = createGame({
      seed: 5,
      raidersFire: false,
      tierProfile: profile({ directorCap: [4], swarmFloor: [4], downloadJitterSeconds: jitter }),
    });
    game.tick(IDLE_INTENT);
    const seen = new Map<number, number>();
    for (let kill = 0; kill < 6; kill++) {
      killOne(game);
      for (const ghost of game.view.ghosts) if (!seen.has(ghost.identityId)) seen.set(ghost.identityId, ghost.remainingSeconds);
    }
    return [...seen.values()];
  }

  it('spreads download times within the jitter', () => {
    const times = downloadTimes(2);
    expect(times.length).toBeGreaterThan(3);
    for (const time of times) {
      expect(time).toBeGreaterThanOrEqual(RESURRECTION_DOWNLOAD_SECONDS - 2 - 0.05);
      expect(time).toBeLessThanOrEqual(RESURRECTION_DOWNLOAD_SECONDS + 2);
    }
    expect(new Set(times.map((time) => time.toFixed(1))).size).toBeGreaterThan(1);
  });

  it('keeps every download at the base time without jitter', () => {
    for (const time of downloadTimes(0)) {
      expect(time).toBeGreaterThan(RESURRECTION_DOWNLOAD_SECONDS - 0.05);
      expect(time).toBeLessThanOrEqual(RESURRECTION_DOWNLOAD_SECONDS);
    }
  });
});
