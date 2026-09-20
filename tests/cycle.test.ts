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
