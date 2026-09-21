import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import { SPEECH_DURATION_SECONDS, SPEECH_RECHARGE_JUMPS } from '../src/domain/combat/speech';
import {
  CYCLE_COMBAT_SECONDS,
  JUMPING_SECONDS,
} from '../src/domain/cycle/jumpCycle';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

function specialPress(): InputIntent {
  return { ...IDLE_INTENT, special: true };
}

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function eventsOf(game: Game, ticks: number, intent: InputIntent = IDLE_INTENT): DomainEvent[] {
  const collected: DomainEvent[] = [];
  for (let i = 0; i < ticks; i++) collected.push(...game.tick(intent));
  return collected;
}

function jumpOnce(game: Game): void {
  eventsOf(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
  game.continueFromJump();
}

describe('The Speech', () => {
  it('starts ready, hovers the swarm, and holds fire for four seconds', () => {
    const game = createGame({ seed: 1, raidersFire: true });
    game.tick(IDLE_INTENT);
    const yBefore = game.view.raiders.map((raider) => raider.y);
    expect(game.view.speechReady).toBe(true);

    const started = game.tick(specialPress());
    expect(started.some((event) => event.type === 'SpeechStarted')).toBe(true);
    expect(game.view.speechActive).toBe(true);
    expect(game.view.speechReady).toBe(false);

    const during = eventsOf(game, ticksFor(SPEECH_DURATION_SECONDS - 0.05));
    expect(during.some((event) => event.type === 'ShotFired' && event.owner === 'cylon')).toBe(false);
    expect(game.view.raiders.map((raider) => raider.y)).toEqual(yBefore);
    expect(game.view.speechActive).toBe(true);

    const ended = eventsOf(game, ticksFor(0.2));
    expect(ended.some((event) => event.type === 'SpeechEnded')).toBe(true);
    expect(game.view.speechActive).toBe(false);
    expect(game.view.speechJumpsUntilReady).toBe(SPEECH_RECHARGE_JUMPS);
  });

  it('does not dump a second speech while the first is talking, or while recharging', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const held: DomainEvent[] = [];
    for (let i = 0; i < 12; i++) held.push(...game.tick(specialPress()));
    expect(held.filter((event) => event.type === 'SpeechStarted')).toHaveLength(1);

    eventsOf(game, ticksFor(SPEECH_DURATION_SECONDS + 0.2));
    game.tick(IDLE_INTENT);
    const again = game.tick(specialPress());
    expect(again.some((event) => event.type === 'SpeechStarted')).toBe(false);
  });

  it('keeps the jump clock running', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    game.tick(specialPress());
    const remaining = game.view.cycle.secondsRemaining;
    eventsOf(game, ticksFor(1.2));
    expect(game.view.cycle.secondsRemaining).toBeLessThan(remaining);
    expect(game.view.speechActive).toBe(true);
  });

  it('is ready again after three jumps', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    game.tick(specialPress());
    eventsOf(game, ticksFor(SPEECH_DURATION_SECONDS + 0.2));
    expect(game.view.speechJumpsUntilReady).toBe(3);

    jumpOnce(game);
    expect(game.view.speechJumpsUntilReady).toBe(2);
    jumpOnce(game);
    expect(game.view.speechJumpsUntilReady).toBe(1);
    jumpOnce(game);
    expect(game.view.speechReady).toBe(true);
    expect(game.view.speechJumpsUntilReady).toBe(0);

    const restarted = game.tick(specialPress());
    expect(restarted.some((event) => event.type === 'SpeechStarted')).toBe(true);
  });

  it('eats a Cylon round instead of ejecting', () => {
    const game = createGame({ seed: 1, raidersFire: true });
    game.tick(IDLE_INTENT);
    game.tick(specialPress());
    const hull = game.view.viper.hp;
    eventsOf(game, ticksFor(SPEECH_DURATION_SECONDS - 0.05));
    expect(game.view.viper.hp).toBe(hull);
    expect(game.view.viper.ejected).toBe(false);
  });
});
