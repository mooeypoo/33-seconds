import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RAIDER_HIT_POINTS } from '../src/domain/swarm/raider';
import { RESURRECTION_DOWNLOAD_SECONDS, RETURNED_SPAWN_PROTECTION_SECONDS } from '../src/domain/swarm/resurrection';

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

function holdTheColumn(game: Game): void {
  const raider = game.view.raider;
  const delta = raider ? raider.x - game.view.viper.x : 0;
  game.tick(move(clampSteer(delta), 0));
}

function destroyTheRaider(game: Game): { identityId: number } {
  for (let i = 0; i < ticksFor(10); i++) {
    holdTheColumn(game);
    if (game.view.kills > 0 && game.view.raider === null) {
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
    const first = destroyTheRaider(game);

    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);
    expect(game.view.ghosts[0]?.identityId).toBe(first.identityId);
    expect(game.view.ghosts[0]?.deaths).toBe(1);
    expect(game.view.ghosts[0]?.remainingSeconds).toBeGreaterThan(RESURRECTION_DOWNLOAD_SECONDS - 0.1);

    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) - 2);
    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);

    run(game, 4);
    expect(game.view.ghosts).toHaveLength(0);
    expect(game.view.raider).not.toBeNull();
    expect(game.view.raider?.identityId).toBe(first.identityId);
    expect(game.view.raider?.returned).toBe(true);
    expect(game.view.raider?.deaths).toBe(1);
    expect(game.view.raider?.hp).toBe(RAIDER_HIT_POINTS);
    expect(game.view.raider?.protected).toBe(true);
  });

  it('does not add a second Raider while a download is holding the slot', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    destroyTheRaider(game);

    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS / 2));
    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);
  });

  it('lets shots pass through a Returned for the protection window', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    destroyTheRaider(game);
    run(game, ticksFor(RESURRECTION_DOWNLOAD_SECONDS) + 2);

    expect(game.view.raider?.returned).toBe(true);
    expect(game.view.raider?.protected).toBe(true);

    for (let i = 0; i < ticksFor(RETURNED_SPAWN_PROTECTION_SECONDS) - 4; i++) {
      holdTheColumn(game);
    }

    expect(game.view.raider?.hp).toBe(RAIDER_HIT_POINTS);
    expect(game.view.raider?.protected).toBe(true);

    for (let i = 0; i < ticksFor(1); i++) {
      holdTheColumn(game);
      if (game.view.raider && game.view.raider.hp < RAIDER_HIT_POINTS) break;
    }

    expect(game.view.raider?.protected).toBe(false);
    expect(game.view.raider?.hp).toBeLessThan(RAIDER_HIT_POINTS);
  });

  it('carries a pending download across the jump, and it arrives first as Returned', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    run(game, ticksFor(28));
    const first = destroyTheRaider(game);
    expect(game.view.ghosts).toHaveLength(1);

    run(game, ticksFor(CYCLE_COMBAT_SECONDS) - game.view.tickCount + 2);
    expect(game.view.cycle.phase).toBe('jumping');
    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);
    expect(game.view.ghosts[0]?.remainingSeconds).toBe(0);

    run(game, ticksFor(JUMPING_SECONDS + 8));
    expect(game.view.cycle.phase).toBe('recovering');
    expect(game.view.raider).toBeNull();
    expect(game.view.ghosts).toHaveLength(1);

    const events = game.continueFromJump();
    const returned = events.find((event) => event.type === 'RaiderSpawned');
    expect(returned).toMatchObject({ returned: true, identityId: first.identityId, deaths: 1 });
    expect(game.view.raider?.returned).toBe(true);
    expect(game.view.ghosts).toHaveLength(0);
  });

  it('does not queue a ghost for a Raider the jump wiped, and the next cycle is fresh', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const identityId = game.view.raider!.identityId;

    run(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    expect(game.view.kills).toBe(0);
    expect(game.view.ghosts).toHaveLength(0);

    game.continueFromJump();
    expect(game.view.raider?.returned).toBe(false);
    expect(game.view.raider?.identityId).not.toBe(identityId);
    expect(game.view.raider?.deaths).toBe(0);
  });
});
