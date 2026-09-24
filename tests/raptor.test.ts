import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import { FLEET_DAMAGE_PER_STRAFE, FLEET_INTEGRITY_MAX } from '../src/domain/fleet/integrity';
import { Raptor, RAPTOR_HIT_POINTS, RAPTOR_RADIUS_UNITS, raptorLaunchX } from '../src/domain/fleet/raptor';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { WORLD_WIDTH_UNITS } from '../src/domain/shared/world';

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function park(moveX: number): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY: 0 };
}

describe('a Raptor escort', () => {
  it('soaks a nearby stray and hangars after three hits', () => {
    const raptor = new Raptor(0, 135, 1);
    expect(raptor.canSoak(135)).toBe(true);
    expect(raptor.canSoak(135 + RAPTOR_RADIUS_UNITS)).toBe(true);
    expect(raptor.canSoak(135 + RAPTOR_RADIUS_UNITS + 1)).toBe(false);
    expect(raptor.takeHit()).toBe(false);
    expect(raptor.takeHit()).toBe(false);
    expect(raptor.takeHit()).toBe(true);
    expect(raptor.isHangared).toBe(true);
    expect(raptor.canSoak(135)).toBe(false);
    expect(raptor.takeHit()).toBe(false);
  });

  it('turns around at the edges', () => {
    const raptor = new Raptor(0, WORLD_WIDTH_UNITS, 1);
    raptor.advance(1);
    expect(raptor.x).toBeLessThan(WORLD_WIDTH_UNITS);
  });
});

describe('Raptor Escort in a run', () => {
  it('does not launch without the card', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(game.view.raptors).toHaveLength(0);
  });

  it('launches one escort per stack, full hull', () => {
    const one = createGame({ seed: 1, raidersFire: false, startingCards: ['raptor-escort'] });
    expect(one.view.raptors).toHaveLength(1);
    expect(one.view.raptors[0]?.hangared).toBe(false);
    expect(one.view.raptors[0]?.hp).toBe(RAPTOR_HIT_POINTS);
    expect(one.view.raptors[0]?.x).toBeCloseTo(raptorLaunchX(0, 1));

    const two = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['raptor-escort', 'raptor-escort'],
    });
    expect(two.view.raptors.filter((raptor) => !raptor.hangared)).toHaveLength(2);
  });

  it('soaks a stray that lands on it', () => {
    // Held gun: the Raiders live to keep firing, so strays keep landing.
    const game = createGame({ seed: 1, viperFires: false, startingCards: ['raptor-escort'] });
    let soaked = false;
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS); i++) {
      // Weave so aimed shots miss mid-field. Parking on an edge sends landings off the line
      // where the escort cannot reach (EDGE_PAD + radius).
      const events = game.tick(i % 90 < 45 ? park(-1) : park(1));
      if (events.some((event) => event.type === 'RaptorHit')) {
        soaked = true;
        expect(game.view.raptors[0]?.hp).toBeLessThan(RAPTOR_HIT_POINTS);
        break;
      }
    }
    expect(soaked).toBe(true);
  });

  it('relaunches at full hull next cycle', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['raptor-escort'] });
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS); i++) {
      game.tick(IDLE_INTENT);
    }
    expect(game.view.cycle.phase).toBe('recovering');
    game.continueFromJump();
    const live = game.view.raptors.filter((raptor) => !raptor.hangared);
    expect(live).toHaveLength(1);
    expect(live[0]?.hp).toBe(RAPTOR_HIT_POINTS);
  });

  it('does not soak a strafing run', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['raptor-escort'] });
    let strafed = false;
    for (let i = 0; i < ticksFor(12); i++) {
      const events = game.tick(IDLE_INTENT);
      if (events.some((event) => event.type === 'FleetHit' && event.kind === 'strafe')) {
        strafed = true;
        expect(game.view.fleet.integrity).toBe(FLEET_INTEGRITY_MAX - FLEET_DAMAGE_PER_STRAFE);
        break;
      }
    }
    expect(strafed).toBe(true);
  });
});
