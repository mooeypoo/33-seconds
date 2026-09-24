import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import {
  VIPER_FIRE_INTERVAL_SECONDS,
  VIPER_SHOT_RADIUS_UNITS,
  VIPER_SHOT_SPEED_UNITS_PER_SECOND,
} from '../src/domain/combat/projectile';
import { movingCircleHits } from '../src/domain/shared/collision';
import type { DomainEvent } from '../src/domain/shared/events';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RAIDER_HIT_POINTS, RAIDER_RADIUS_UNITS, RAIDER_SPAWN_Y_UNITS } from '../src/domain/swarm/raider';
import { DIRECTOR_CAP, RESURRECTION_DOWNLOAD_SECONDS } from '../src/domain/swarm/resurrection';

function move(moveX: number, moveY: number): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY };
}

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function eventsOf(game: Game, ticks: number, intent: InputIntent = IDLE_INTENT): DomainEvent[] {
  const collected: DomainEvent[] = [];
  for (let i = 0; i < ticks; i++) collected.push(...game.tick(intent));
  return collected;
}

/** Maps a world-unit offset onto the -1..1 stick, so tests can hold a column. */
function clampSteer(deltaUnits: number): number {
  if (deltaUnits === 0) return 0;
  const scaled = deltaUnits / 20;
  if (scaled > 1) return 1;
  if (scaled < -1) return -1;
  return scaled;
}

describe('auto-fire', () => {
  it('fires without a fire button, toward the swarm, on the first tick', () => {
    const game = createGame();
    const events = game.tick(IDLE_INTENT);
    const shots = events.filter((event) => event.type === 'ShotFired' && event.owner === 'player');

    expect(shots).toHaveLength(1);
    expect(game.view.projectiles).toHaveLength(1);
    expect(game.view.projectiles[0]?.y).toBeLessThan(game.view.viper.y);
  });

  it('respects the fire interval instead of shooting every tick', () => {
    const game = createGame();
    const fired = eventsOf(game, ticksFor(1)).filter((event) => event.type === 'ShotFired' && event.owner === 'player');

    const expected = Math.floor(1 / VIPER_FIRE_INTERVAL_SECONDS);
    expect(fired).toHaveLength(expected);
  });

  it('sends every shot straight up, never sideways', () => {
    const game = createGame();
    game.tick(move(1, 0));
    const shot = game.view.projectiles[0];
    expect(shot).toBeDefined();

    const xAtBirth = shot!.x;
    game.tick(IDLE_INTENT);

    expect(game.view.projectiles[0]?.x).toBe(xAtBirth);
    expect(game.view.projectiles[0]?.y).toBeLessThan(shot!.y);
  });

  it('despawns a shot that leaves the top of the world, and recycles the slot', () => {
    const game = createGame();
    const secondsToLeave = (480 + 20) / VIPER_SHOT_SPEED_UNITS_PER_SECOND;
    eventsOf(game, ticksFor(secondsToLeave + 0.2));

    for (const shot of game.view.projectiles) {
      expect(shot.y).toBeGreaterThan(-20);
    }
    expect(game.view.projectiles.length).toBeLessThanOrEqual(6);
  });
});

describe('the first Raiders', () => {
  it('spawns the Director cap on the first tick and flies down', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    const events = game.tick(IDLE_INTENT);
    const spawned = events.filter((event) => event.type === 'RaiderSpawned');

    expect(spawned).toHaveLength(DIRECTOR_CAP);
    expect(game.view.raiders).toHaveLength(DIRECTOR_CAP);
    expect(game.view.raiders[0]!.y).toBeGreaterThan(RAIDER_SPAWN_Y_UNITS);

    const yAtBirth = game.view.raiders[0]!.y;
    game.tick(IDLE_INTENT);
    expect(game.view.raiders[0]!.y).toBeGreaterThan(yAtBirth);
  });

  it('appears in the same columns when the seed is the same, and not when it is not', () => {
    const first = createGame({ seed: 7 });
    const again = createGame({ seed: 7 });
    const other = createGame({ seed: 99 });

    first.tick(IDLE_INTENT);
    again.tick(IDLE_INTENT);
    other.tick(IDLE_INTENT);

    expect(first.view.raiders.map((raider) => raider.x)).toEqual(again.view.raiders.map((raider) => raider.x));
    expect(other.view.raiders.map((raider) => raider.x)).not.toEqual(first.view.raiders.map((raider) => raider.x));
  });

  it('never has more live Raiders than the Director cap', () => {
    const game = createGame();

    for (let i = 0; i < ticksFor(8); i++) {
      game.tick(IDLE_INTENT);
      expect(game.view.raiders.length).toBeLessThanOrEqual(DIRECTOR_CAP);
    }
  });

  it('reappears at the top of its column after flying off the bottom, without counting as a kill', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const tracked = game.view.raiders[0]!;
    const id = tracked.id;
    const x = tracked.x;

    eventsOf(game, ticksFor(12));

    const same = game.view.raiders.find((raider) => raider.id === id);
    expect(game.view.kills).toBe(0);
    expect(same?.x).toBe(x);
    expect(same!.y).toBeGreaterThan(0);
    expect(same!.y).toBeLessThan(480);
  });

  it('takes several hits to destroy, then the same soul returns after the download', () => {
    const game = createGame({ seed: 1, raidersFire: false });

    let destroyed: { id: number; identityId: number } | null = null;
    for (let i = 0; i < ticksFor(8); i++) {
      const raider = game.view.raiders[0];
      const delta = raider ? raider.x - game.view.viper.x : 0;
      const events = game.tick(move(clampSteer(delta), 0));
      const kill = events.find((event) => event.type === 'RaiderDestroyed');
      if (kill && raider) {
        destroyed = { id: kill.id, identityId: raider.identityId };
        break;
      }
    }

    expect(destroyed).not.toBeNull();
    expect(game.view.kills).toBe(1);
    expect(game.view.raiders.some((raider) => raider.id === destroyed!.id)).toBe(false);
    expect(game.view.ghosts).toHaveLength(1);

    eventsOf(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) - 2);
    expect(game.view.raiders.some((raider) => raider.identityId === destroyed!.identityId)).toBe(false);

    eventsOf(game, 4);
    const returned = game.view.raiders.find((raider) => raider.identityId === destroyed!.identityId);
    expect(returned).toBeDefined();
    expect(returned?.id).not.toBe(destroyed!.id);
    expect(returned?.returned).toBe(true);
    expect(returned?.hp).toBe(RAIDER_HIT_POINTS);
  });
});

describe('a shot hitting a Raider', () => {
  it('still counts when the shot leaps over the Raider in one tick', () => {
    // Endpoint-only overlap would miss: the shot starts below the Raider and ends above it.
    expect(movingCircleHits(0, 20, 0, -20, 2, 0, 0, 6)).toBe(true);
    expect(movingCircleHits(0, 20, 0, -20, 2, 40, 0, 6)).toBe(false);
  });

  // The Raider is drawn 24 units across (docs/art/ART-SCALE.md): wingtips 12 units from its middle.
  const shotPast = (offsetX: number): boolean =>
    movingCircleHits(offsetX, 20, offsetX, -20, VIPER_SHOT_RADIUS_UNITS, 0, 0, RAIDER_RADIUS_UNITS);

  it('counts a shot through the wing', () => {
    expect(shotPast(9)).toBe(true);
  });

  it('lets a shot past the wingtip miss', () => {
    expect(shotPast(13)).toBe(false);
  });
});
