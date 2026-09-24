import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { VIPER_EJECT_SECONDS, VIPER_HULL_HIT_POINTS, VIPER_SPAWN_X_UNITS, VIPER_SPAWN_Y_UNITS } from '../src/domain/combat/viper';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { CYCLE_COMBAT_SECONDS } from '../src/domain/cycle/jumpCycle';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function run(game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) game.tick(IDLE_INTENT);
}

describe('the Viper hull', () => {
  it('starts full, and a Cylon round takes a point off it', () => {
    const game = createGame();
    expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS);

    let sawCylonRound = false;
    for (let i = 0; i < ticksFor(4); i++) {
      const events = game.tick(IDLE_INTENT);
      if (events.some((event) => event.type === 'ShotFired' && event.owner === 'cylon')) sawCylonRound = true;
      if (game.view.viper.hp < VIPER_HULL_HIT_POINTS) break;
    }

    expect(sawCylonRound).toBe(true);
    expect(game.view.viper.hp).toBeLessThan(VIPER_HULL_HIT_POINTS);
  });

  it('ejects after the last hull point, then a pickup puts a fresh Viper at the spawn', () => {
    const game = createGame();
    let ejected = false;
    for (let i = 0; i < ticksFor(20); i++) {
      const events = game.tick(IDLE_INTENT);
      if (events.some((event) => event.type === 'ViperEjected')) {
        ejected = true;
        expect(game.view.viper.ejected).toBe(true);
        expect(game.view.viper.hp).toBe(0);
        expect(game.view.viper.ejectProgress).toBeLessThan(0.05);
        break;
      }
    }
    expect(ejected).toBe(true);

    const stillDown = Array.from({ length: ticksFor(VIPER_EJECT_SECONDS) - 2 }, () => game.tick(IDLE_INTENT));
    expect(stillDown.some((events) => events.some((event) => event.type === 'ShotFired' && event.owner === 'player'))).toBe(
      false,
    );
    expect(game.view.viper.ejected).toBe(true);
    // The chute's drift is timed on this, so it must reach the end as the pickup arrives.
    expect(game.view.viper.ejectProgress).toBeGreaterThan(0.9);

    let recovered = false;
    for (let i = 0; i < ticksFor(2); i++) {
      const events = game.tick(IDLE_INTENT);
      if (events.some((event) => event.type === 'ViperRecovered')) {
        recovered = true;
        expect(game.view.viper.ejected).toBe(false);
        expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS);
        expect(game.view.viper.ejectProgress).toBe(0);
        expect(game.view.viper.x).toBe(VIPER_SPAWN_X_UNITS);
        expect(game.view.viper.y).toBe(VIPER_SPAWN_Y_UNITS);
        break;
      }
    }
    expect(recovered).toBe(true);
  });

  it('does not end the run: the cycle clock keeps moving through an eject', () => {
    const game = createGame();
    run(game, ticksFor(8));
    expect(game.view.cycle.phase).not.toBe('recovering');
    expect(game.view.tickCount).toBeGreaterThan(0);
  });

  it('comes back with a full hull at the jump, even mid-eject', () => {
    const game = createGame();
    run(game, ticksFor(CYCLE_COMBAT_SECONDS));
    expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS);
    expect(game.view.viper.ejected).toBe(false);
  });
});
