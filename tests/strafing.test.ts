import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { FLEET_DAMAGE_PER_STRAFE, FLEET_INTEGRITY_MAX } from '../src/domain/fleet/integrity';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { STRAFE_TOKENS } from '../src/domain/swarm/resurrection';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

describe('strafing runs', () => {
  it('hands out at most one strafe token at a time', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    for (let i = 0; i < ticksFor(3); i++) {
      game.tick(IDLE_INTENT);
      const strafing = game.view.raiders.filter((raider) => raider.strafing);
      expect(strafing.length).toBeLessThanOrEqual(STRAFE_TOKENS);
    }
  });

  it('gives the dive to the Raider farther from the Viper', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(2);
    const viper = game.view.viper;
    const ranked = [...game.view.raiders].sort((left, right) => {
      const leftDistance = Math.hypot(left.x - viper.x, left.y - viper.y);
      const rightDistance = Math.hypot(right.x - viper.x, right.y - viper.y);
      return rightDistance - leftDistance;
    });
    expect(ranked[0]?.strafing).toBe(true);
    expect(ranked[1]?.strafing).toBe(false);
  });

  it('dents the fleet when a strafing Raider crosses the line', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    let strafed = false;
    for (let i = 0; i < ticksFor(12); i++) {
      const events = game.tick(IDLE_INTENT);
      for (const event of events) {
        if (event.type !== 'FleetHit' || event.kind !== 'strafe') continue;
        strafed = true;
        expect(event.damage).toBe(FLEET_DAMAGE_PER_STRAFE);
        expect(game.view.fleet.integrity).toBe(FLEET_INTEGRITY_MAX - FLEET_DAMAGE_PER_STRAFE);
        break;
      }
      if (strafed) break;
    }
    expect(strafed).toBe(true);
  });

  it('still has both Raiders after a dive wraps', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const ids = new Set(game.view.raiders.map((raider) => raider.id));
    expect(ids.size).toBe(2);
    for (let i = 0; i < ticksFor(12); i++) game.tick(IDLE_INTENT);
    expect(game.view.raiders).toHaveLength(2);
    expect(new Set(game.view.raiders.map((raider) => raider.id))).toEqual(ids);
  });
});
