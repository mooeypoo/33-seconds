import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import {
  ARRIVING_SECONDS,
  CYCLE_COMBAT_SECONDS,
  JUMPING_SECONDS,
  SPOOLING_START_SECONDS,
} from '../src/domain/cycle/jumpCycle';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function run(game: Game, ticks: number): void {
  for (let i = 0; i < ticks; i++) game.tick(IDLE_INTENT);
}

describe('the 33-second cycle', () => {
  it('starts arriving, with 33 seconds on the clock', () => {
    const game = createGame();
    const events = game.tick(IDLE_INTENT);

    expect(events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'arriving')).toBe(true);
    expect(game.view.cycle).toMatchObject({ phase: 'arriving', cycleIndex: 1, secondsRemaining: 33 });
  });

  it('enters building at 5 seconds, spooling at 25, and jumping at 33', () => {
    const game = createGame();
    game.tick(IDLE_INTENT);

    run(game, ticksFor(ARRIVING_SECONDS) - 1);
    expect(game.view.cycle.phase).toBe('building');

    run(game, ticksFor(SPOOLING_START_SECONDS - ARRIVING_SECONDS));
    expect(game.view.cycle.phase).toBe('spooling');
    expect(game.view.cycle.secondsRemaining).toBe(CYCLE_COMBAT_SECONDS - SPOOLING_START_SECONDS);

    run(game, ticksFor(CYCLE_COMBAT_SECONDS - SPOOLING_START_SECONDS));
    expect(game.view.cycle.phase).toBe('jumping');
    expect(game.view.cycle.secondsRemaining).toBe(0);
  });

  it('clears shots and the Raider on the jump, without counting a kill', () => {
    const game = createGame();
    run(game, ticksFor(CYCLE_COMBAT_SECONDS));

    expect(game.view.cycle.phase).toBe('jumping');
    expect(game.view.projectiles).toHaveLength(0);
    expect(game.view.raiders).toHaveLength(0);
    expect(game.view.kills).toBe(0);
  });

  it('does not auto-advance Recovering, however long you wait', () => {
    const game = createGame();
    run(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS + 20));

    expect(game.view.cycle.phase).toBe('recovering');
    expect(game.view.cycle.cycleIndex).toBe(1);
  });

  it('starts the next cycle only when Continue is chosen', () => {
    const game = createGame();
    run(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    expect(game.view.cycle.phase).toBe('recovering');

    const events = game.continueFromJump();

    expect(events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'arriving')).toBe(true);
    expect(game.view.cycle).toMatchObject({ phase: 'arriving', cycleIndex: 2, secondsRemaining: 33 });
    expect(game.view.raiders.length).toBeGreaterThan(0);
  });

  it('ignores Continue until the fleet is actually recovering', () => {
    const game = createGame();
    game.tick(IDLE_INTENT);

    expect(game.continueFromJump()).toEqual([]);
    expect(game.view.cycle.cycleIndex).toBe(1);
    expect(game.view.cycle.phase).toBe('arriving');
  });
});

describe('the Slow FTL cycle (66 seconds, PRD 11.1)', () => {
  /** The tick on which each phase change lands, over one whole cycle and its jump. */
  function phaseChanges(game: Game): Record<string, number> {
    const at: Record<string, number> = {};
    for (let tick = 1; tick <= ticksFor(66 + JUMPING_SECONDS + 1); tick++) {
      for (const event of game.tick(IDLE_INTENT)) {
        if (event.type === 'CyclePhaseChanged') at[event.phase] ??= tick;
      }
    }
    return at;
  }

  it('keeps arriving at 5 seconds and the spool at the last 8, and jumps at 66', () => {
    const slow = phaseChanges(createGame({ cycleSeconds: 66 }));
    const story = phaseChanges(createGame());
    expect(slow.building).toBe(story.building);
    expect(slow.spooling).toBe(ticksFor(66 - 8));
    expect(slow.jumping).toBe(ticksFor(66));
    // The spool lasts as long as it always has: only the building phase is longer.
    expect((slow.jumping ?? 0) - (slow.spooling ?? 0)).toBe((story.jumping ?? 0) - (story.spooling ?? 0));
    expect((slow.recovering ?? 0) - (slow.jumping ?? 0)).toBe((story.recovering ?? 0) - (story.jumping ?? 0));
  });

  it('counts down from 66, and the spool fills over its last 8 seconds', () => {
    const game = createGame({ cycleSeconds: 66 });
    game.tick(IDLE_INTENT);
    expect(game.view.cycle).toMatchObject({ combatSeconds: 66, secondsRemaining: 66, spoolProgress: 0 });
    run(game, ticksFor(62) - 1);
    expect(game.view.cycle.phase).toBe('spooling');
    expect(game.view.cycle.secondsRemaining).toBe(4);
    expect(game.view.cycle.spoolProgress).toBeCloseTo(0.5);
  });

  it('is 66 in every cycle, not only the first', () => {
    const game = createGame({ cycleSeconds: 66, raidersFire: false });
    run(game, ticksFor(66 + JUMPING_SECONDS));
    expect(game.view.cycle.phase).toBe('recovering');
    game.continueFromJump();
    run(game, ticksFor(40));
    expect(game.view.cycle).toMatchObject({ cycleIndex: 2, phase: 'building', secondsRemaining: 26 });
  });
});
