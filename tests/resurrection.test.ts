import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RAIDER_HIT_POINTS } from '../src/domain/swarm/raider';
import {
  DIRECTOR_CAP,
  RESURRECTION_DOWNLOAD_SECONDS,
  RETURNED_SPAWN_PROTECTION_SECONDS,
} from '../src/domain/swarm/resurrection';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function move(moveX: number, moveY: number): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY };
}

function clampSteer(deltaUnits: number): number {
  if (deltaUnits === 0) return 0;
  const scaled = deltaUnits / 20;
  if (scaled > 1) return 1;
  if (scaled < -1) return -1;
  return scaled;
}

function run(game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) game.tick(IDLE_INTENT);
}

function holdUnder(game: Game, x: number): void {
  game.tick(move(clampSteer(x - game.view.viper.x), 0));
}

function destroyOne(game: Game): { identityId: number } {
  const before = game.view.kills;
  for (let i = 0; i < ticksFor(10); i++) {
    const target = game.view.raiders[0];
    holdUnder(game, target?.x ?? game.view.viper.x);
    if (game.view.kills > before) {
      const ghost = game.view.ghosts[0];
      expect(ghost).toBeDefined();
      return { identityId: ghost!.identityId };
    }
  }
  throw new Error('expected a kill');
}

describe('resurrection', () => {
  it('turns a kill into a ghost, then the same soul comes back as Returned', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    const first = destroyOne(game);

    expect(game.view.raiders.some((raider) => raider.identityId === first.identityId)).toBe(false);
    expect(game.view.ghosts).toHaveLength(1);
    expect(game.view.ghosts[0]?.identityId).toBe(first.identityId);
    expect(game.view.ghosts[0]?.deaths).toBe(1);
    expect(game.view.ghosts[0]?.remainingSeconds).toBeGreaterThan(RESURRECTION_DOWNLOAD_SECONDS - 0.1);

    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) - 2);
    expect(game.view.raiders.some((raider) => raider.identityId === first.identityId)).toBe(false);
    expect(game.view.ghosts).toHaveLength(1);

    run(game, 4);
    const returned = game.view.raiders.find((raider) => raider.identityId === first.identityId);
    expect(game.view.ghosts).toHaveLength(0);
    expect(returned?.returned).toBe(true);
    expect(returned?.deaths).toBe(1);
    expect(returned?.hp).toBe(RAIDER_HIT_POINTS);
    expect(returned?.protected).toBe(true);
  });

  it('does not add a body while a download is holding its slot', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    destroyOne(game);

    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS / 2));
    expect(game.view.raiders.length + game.view.ghosts.length).toBe(DIRECTOR_CAP);
    expect(game.view.raiders.length).toBe(DIRECTOR_CAP - 1);
    expect(game.view.ghosts).toHaveLength(1);
  });

  it('lets shots pass through a Returned for the protection window', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    const first = destroyOne(game);
    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) + 2);

    const returned = () => game.view.raiders.find((raider) => raider.identityId === first.identityId);
    expect(returned()?.returned).toBe(true);
    expect(returned()?.protected).toBe(true);

    for (let i = 0; i < ticksFor(RETURNED_SPAWN_PROTECTION_SECONDS) - 4; i++) {
      holdUnder(game, returned()?.x ?? game.view.viper.x);
    }

    expect(returned()?.hp).toBe(RAIDER_HIT_POINTS);
    expect(returned()?.protected).toBe(true);

    for (let i = 0; i < ticksFor(1); i++) {
      holdUnder(game, returned()?.x ?? game.view.viper.x);
      if (returned() && returned()!.hp < RAIDER_HIT_POINTS) break;
    }

    expect(returned()?.protected).toBe(false);
    expect(returned()?.hp).toBeLessThan(RAIDER_HIT_POINTS);
  });

  it('carries a pending download across the jump, and it arrives first as Returned', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    run(game, ticksFor(28));
    const first = destroyOne(game);
    expect(game.view.ghosts).toHaveLength(1);

    run(game, ticksFor(CYCLE_COMBAT_SECONDS) - game.view.tickCount + 2);
    expect(game.view.cycle.phase).toBe('jumping');
    expect(game.view.raiders).toHaveLength(0);
    expect(game.view.ghosts).toHaveLength(1);
    expect(game.view.ghosts[0]?.remainingSeconds).toBe(0);

    run(game, ticksFor(JUMPING_SECONDS + 8));
    expect(game.view.cycle.phase).toBe('recovering');
    expect(game.view.raiders).toHaveLength(0);
    expect(game.view.ghosts).toHaveLength(1);

    const events = game.continueFromJump();
    const returned = events.find((event) => event.type === 'RaiderSpawned' && event.returned);
    expect(returned).toMatchObject({ returned: true, identityId: first.identityId, deaths: 1 });
    expect(game.view.raiders.some((raider) => raider.identityId === first.identityId && raider.returned)).toBe(true);
    expect(game.view.ghosts).toHaveLength(0);
  });

  it('does not queue a ghost for a Raider the jump wiped, and the next cycle is fresh', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const identities = game.view.raiders.map((raider) => raider.identityId);

    run(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    expect(game.view.kills).toBe(0);
    expect(game.view.ghosts).toHaveLength(0);

    game.continueFromJump();
    expect(game.view.raiders.every((raider) => !raider.returned)).toBe(true);
    expect(game.view.raiders.every((raider) => raider.deaths === 0)).toBe(true);
    expect(game.view.raiders.some((raider) => identities.includes(raider.identityId))).toBe(false);
  });
});
