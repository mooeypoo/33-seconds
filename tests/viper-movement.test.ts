import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../src/domain/shared/world';
import {
  VIPER_HALF_HEIGHT_UNITS,
  VIPER_HALF_WIDTH_UNITS,
  VIPER_MAX_SPEED_UNITS_PER_SECOND,
  VIPER_SPAWN_X_UNITS,
  VIPER_SPAWN_Y_UNITS,
} from '../src/domain/combat/viper';

/** Everything here drives the domain through its only entry point, `tick`. */
function move(moveX: number, moveY: number): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY };
}

function speedOf(game: Game): number {
  const { velocityX, velocityY } = game.view.viper;
  return Math.hypot(velocityX, velocityY);
}

describe('flying the Viper', () => {
  it('reports the Viper as spawned exactly once, on the first tick', () => {
    const game = createGame({ raidersFire: false });

    const first = game.tick(IDLE_INTENT);
    const second = game.tick(IDLE_INTENT);

    expect(first.filter((event) => event.type === 'ViperSpawned')).toEqual([
      { type: 'ViperSpawned', x: VIPER_SPAWN_X_UNITS, y: VIPER_SPAWN_Y_UNITS },
    ]);
    expect(second.filter((event) => event.type === 'ViperSpawned')).toEqual([]);
  });

  it('accelerates towards the direction asked for, rather than snapping to top speed', () => {
    const game = createGame({ raidersFire: false });
    game.tick(move(1, 0));

    const speedAfterOneTick = speedOf(game);

    expect(speedAfterOneTick).toBeGreaterThan(0);
    expect(speedAfterOneTick).toBeLessThan(VIPER_MAX_SPEED_UNITS_PER_SECOND);
  });

  it('never exceeds top speed, however hard the input pushes', () => {
    const game = createGame({ raidersFire: false });

    // An adapter would normalise this; the domain does not trust it to.
    for (let i = 0; i < TICKS_PER_SECOND; i++) game.tick(move(50, -50));

    expect(speedOf(game)).toBeLessThanOrEqual(VIPER_MAX_SPEED_UNITS_PER_SECOND + 1e-9);
  });

  it('flies a diagonal no faster than a straight line', () => {
    const straight = createGame({ raidersFire: false });
    const diagonal = createGame({ raidersFire: false });

    for (let i = 0; i < TICKS_PER_SECOND; i++) {
      straight.tick(move(1, 0));
      diagonal.tick(move(1, 1));
    }

    expect(speedOf(diagonal)).toBeLessThanOrEqual(speedOf(straight) + 1e-9);
  });

  it('coasts to a stop when the player lets go, instead of stopping dead', () => {
    const game = createGame({ raidersFire: false });
    for (let i = 0; i < TICKS_PER_SECOND; i++) game.tick(move(1, 0));

    game.tick(IDLE_INTENT);
    const speedJustAfterRelease = speedOf(game);

    expect(speedJustAfterRelease).toBeGreaterThan(0);

    for (let i = 0; i < TICKS_PER_SECOND; i++) game.tick(IDLE_INTENT);
    expect(speedOf(game)).toBe(0);
  });

  it('keeps the whole ship inside the play area, whichever edge it is held against', () => {
    const corners = [
      { intent: move(-1, -1), expectedX: VIPER_HALF_WIDTH_UNITS, expectedY: VIPER_HALF_HEIGHT_UNITS },
      {
        intent: move(1, 1),
        expectedX: WORLD_WIDTH_UNITS - VIPER_HALF_WIDTH_UNITS,
        expectedY: WORLD_HEIGHT_UNITS - VIPER_HALF_HEIGHT_UNITS,
      },
    ];

    for (const corner of corners) {
      const game = createGame({ raidersFire: false });
      // Ten seconds of holding into the corner is far longer than crossing the world takes.
      for (let i = 0; i < TICKS_PER_SECOND * 10; i++) game.tick(corner.intent);

      expect(game.view.viper.x).toBe(corner.expectedX);
      expect(game.view.viper.y).toBe(corner.expectedY);
    }
  });

  it('leaves an edge the moment the player steers away, instead of feeling stuck to it', () => {
    const game = createGame({ raidersFire: false });
    for (let i = 0; i < TICKS_PER_SECOND * 3; i++) game.tick(move(-1, 0));

    // Pinned against the wall with no stored-up momentum: otherwise turning around would first
    // have to spend the leftover speed, which reads as the wall holding on to you.
    expect(game.view.viper.x).toBe(VIPER_HALF_WIDTH_UNITS);
    expect(game.view.viper.velocityX).toBe(0);

    game.tick(move(1, 0));

    expect(game.view.viper.velocityX).toBeGreaterThan(0);
    expect(game.view.viper.x).toBeGreaterThan(VIPER_HALF_WIDTH_UNITS);
  });

  it('ignores nonsense input instead of flying off to NaN', () => {
    const game = createGame({ raidersFire: false });
    const startX = game.view.viper.x;

    game.tick(move(Number.NaN, Number.POSITIVE_INFINITY));

    expect(game.view.viper.x).toBe(startX);
    expect(Number.isFinite(game.view.viper.y)).toBe(true);
  });

  it('gives the renderer the previous tick to interpolate from', () => {
    const game = createGame({ raidersFire: false });
    for (let i = 0; i < 10; i++) game.tick(move(0, -1));

    const { previousY, y, velocityY } = game.view.viper;

    expect(previousY).toBeGreaterThan(y);
    // One tick of travel, which is what the renderer interpolates across.
    expect(previousY - y).toBeCloseTo(-velocityY / TICKS_PER_SECOND, 6);
  });

  it('replays identically from the same sequence of intents', () => {
    const intents = [move(1, 0), move(1, -1), IDLE_INTENT, move(-1, 0), move(0, 1)];
    const first = createGame({ raidersFire: false });
    const second = createGame({ raidersFire: false });

    for (let i = 0; i < 300; i++) {
      const intent = intents[i % intents.length]!;
      first.tick(intent);
      second.tick(intent);
    }

    expect(first.view).toEqual(second.view);
  });
});
