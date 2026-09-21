import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { ImaginarySix, SIX_DAMAGE, SIX_OFFSET_X_UNITS } from '../src/domain/combat/imaginarySix';
import { RAIDER_HIT_POINTS } from '../src/domain/swarm/raider';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { WORLD_WIDTH_UNITS } from '../src/domain/shared/world';

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function park(moveX: number, moveY = 0): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY };
}

describe('Imaginary Six', () => {
  it('sits starboard and vanishes when the Viper ejects', () => {
    const six = new ImaginarySix();
    six.follow(135, 200, false);
    expect(six.isPresent).toBe(true);
    expect(six.x).toBe(135 + SIX_OFFSET_X_UNITS);
    expect(six.y).toBe(200);
    six.follow(WORLD_WIDTH_UNITS - 4, 200, false);
    expect(six.x).toBeLessThan(WORLD_WIDTH_UNITS - 4);
    six.follow(135, 200, true);
    expect(six.isPresent).toBe(false);
    expect(six.inRange(135, 200)).toBe(false);
  });
});

describe('Imaginary Six in a run', () => {
  it('does not appear without the card', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(game.view.imaginarySix).toBeNull();
  });

  it('forms up beside the Viper', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['imaginary-six'] });
    game.tick(IDLE_INTENT);
    const six = game.view.imaginarySix;
    expect(six?.present).toBe(true);
    expect(six?.x).toBeCloseTo(game.view.viper.x + SIX_OFFSET_X_UNITS);
    expect(six?.y).toBeCloseTo(game.view.viper.y);
  });

  it('hurts a strafing Raider in range and leaves parked ones alone', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      viperFires: false,
      startingCards: ['imaginary-six'],
    });
    game.tick(IDLE_INTENT);
    const parkedId = game.view.raiders.find((raider) => !raider.strafing)?.id;
    let dented = false;
    for (let i = 0; i < ticksFor(12); i++) {
      const strafeNow = game.view.raiders.find((raider) => raider.strafing);
      const chase: InputIntent = strafeNow
        ? park(Math.sign(strafeNow.x - game.view.viper.x), strafeNow.y < game.view.viper.y ? -1 : 0)
        : IDLE_INTENT;
      game.tick(chase);
      const parked = game.view.raiders.find((raider) => raider.id === parkedId && !raider.strafing);
      if (parked) expect(parked.hp).toBe(RAIDER_HIT_POINTS);
      const strafe = game.view.raiders.find((raider) => raider.strafing);
      if (strafe && strafe.hp < RAIDER_HIT_POINTS) {
        dented = true;
        expect(strafe.hp).toBeCloseTo(RAIDER_HIT_POINTS - SIX_DAMAGE);
        break;
      }
      if (game.view.kills > 0) {
        dented = true;
        break;
      }
    }
    expect(dented).toBe(true);
  });

  it('eats a stray that enters range', () => {
    const game = createGame({ seed: 1, startingCards: ['imaginary-six'] });
    let intercepted = false;
    for (let i = 0; i < ticksFor(25); i++) {
      const events = game.tick(i % 90 < 45 ? park(-1) : park(1));
      if (events.some((event) => event.type === 'SixIntercepted')) {
        intercepted = true;
        break;
      }
    }
    expect(intercepted).toBe(true);
  });

  it('stays off the board while the Viper is ejected', () => {
    const game = createGame({ seed: 1, startingCards: ['imaginary-six'] });
    let gone = false;
    for (let i = 0; i < ticksFor(8); i++) {
      game.tick(IDLE_INTENT);
      if (game.view.viper.ejected) {
        expect(game.view.imaginarySix).toBeNull();
        gone = true;
        break;
      }
    }
    expect(gone).toBe(true);
  });
});
