import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { VIPER_FIRE_INTERVAL_SECONDS, VIPER_SHOT_SPEED_UNITS_PER_SECOND } from '../src/domain/combat/projectile';
import { movingCircleHits } from '../src/domain/shared/collision';
import type { DomainEvent } from '../src/domain/shared/events';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RAIDER_HIT_POINTS, RAIDER_SPAWN_Y_UNITS } from '../src/domain/swarm/raider';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../src/domain/swarm/resurrection';

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

describe('the first Raider', () => {
  it('spawns on the first tick and flies down', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    const events = game.tick(IDLE_INTENT);
    const spawned = events.filter((event) => event.type === 'RaiderSpawned');

    expect(spawned).toHaveLength(1);
    expect(game.view.raider).not.toBeNull();
    expect(game.view.raider!.y).toBeGreaterThan(RAIDER_SPAWN_Y_UNITS);

    const yAtBirth = game.view.raider!.y;
    game.tick(IDLE_INTENT);
    expect(game.view.raider!.y).toBeGreaterThan(yAtBirth);
  });

  it('appears in the same column when the seed is the same, and not when it is not', () => {
    const first = createGame({ seed: 7 });
    const again = createGame({ seed: 7 });
    const other = createGame({ seed: 99 });

    first.tick(IDLE_INTENT);
    again.tick(IDLE_INTENT);
    other.tick(IDLE_INTENT);

    expect(first.view.raider?.x).toBe(again.view.raider?.x);
    expect(other.view.raider?.x).not.toBe(first.view.raider?.x);
  });

  it('never has more than one Raider on screen', () => {
    const game = createGame();
    let live = false;

    for (let i = 0; i < ticksFor(8); i++) {
      const events = game.tick(IDLE_INTENT);
      for (const event of events) {
        if (event.type === 'RaiderSpawned') {
          expect(live).toBe(false);
          live = true;
        }
        if (event.type === 'RaiderDestroyed') live = false;
      }
    }
  });

  it('reappears at the top of its column after flying off the bottom, without counting as a kill', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const id = game.view.raider!.id;
    const x = game.view.raider!.x;

    eventsOf(game, ticksFor(12));

    expect(game.view.kills).toBe(0);
    expect(game.view.raider?.id).toBe(id);
    expect(game.view.raider?.x).toBe(x);
    expect(game.view.raider!.y).toBeGreaterThan(0);
    expect(game.view.raider!.y).toBeLessThan(480);
  });

  it('takes several hits to destroy, then the same soul returns after the download', () => {
    const game = createGame({ seed: 1, raidersFire: false });

    let destroyed: { id: number; identityId: number } | null = null;
    for (let i = 0; i < ticksFor(8); i++) {
      const raider = game.view.raider;
      const delta = raider ? raider.x - game.view.viper.x : 0;
      // Keep station under the Raider. Letting go would coast off the column (the Viper has mass).
      const events = game.tick(move(clampSteer(delta), 0));
      const kill = events.find((event) => event.type === 'RaiderDestroyed');
      if (kill && raider) {
        destroyed = { id: kill.id, identityId: raider.identityId };
        break;
      }
    }

    expect(destroyed).not.toBeNull();
    expect(game.view.kills).toBe(1);
    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);

    eventsOf(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) - 2);
    expect(game.view.raider).toBeNull();

    eventsOf(game, 4);
    expect(game.view.raider).not.toBeNull();
    expect(game.view.raider?.id).not.toBe(destroyed!.id);
    expect(game.view.raider?.identityId).toBe(destroyed!.identityId);
    expect(game.view.raider?.returned).toBe(true);
    expect(game.view.raider?.hp).toBe(RAIDER_HIT_POINTS);
  });
});

describe('a shot hitting a Raider', () => {
  it('still counts when the shot leaps over the Raider in one tick', () => {
    // Endpoint-only overlap would miss: the shot starts below the Raider and ends above it.
    expect(movingCircleHits(0, 20, 0, -20, 2, 0, 0, 6)).toBe(true);
    expect(movingCircleHits(0, 20, 0, -20, 2, 40, 0, 6)).toBe(false);
  });
});
