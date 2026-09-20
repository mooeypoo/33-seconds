import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

describe('the Director', () => {
  it('fills the cap with two live Raiders and does not add a third', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);

    expect(game.view.raiders).toHaveLength(2);
    expect(new Set(game.view.raiders.map((raider) => raider.x)).size).toBe(2);

    for (let i = 0; i < ticksFor(4); i++) {
      game.tick(IDLE_INTENT);
      expect(game.view.raiders.length).toBeLessThanOrEqual(2);
    }
  });

  it('hands out at most one attack token at a time', () => {
    const game = createGame({ seed: 1 });

    for (let i = 0; i < ticksFor(3); i++) {
      game.tick(IDLE_INTENT);
      const armed = game.view.raiders.filter((raider) => raider.armed);
      expect(armed.length).toBeLessThanOrEqual(1);
    }
  });

  it('fires about as often as one Raider, not two', () => {
    const game = createGame({ seed: 1 });
    let cylonShots = 0;
    for (let i = 0; i < ticksFor(2); i++) {
      const events = game.tick(IDLE_INTENT);
      cylonShots += events.filter((event) => event.type === 'ShotFired' && event.owner === 'cylon').length;
    }

    // One token, 0.45 s first delay, 0.7 s interval: about three rounds in two seconds.
    // Two shooters would be closer to six.
    expect(cylonShots).toBeGreaterThan(0);
    expect(cylonShots).toBeLessThan(5);
  });
});
