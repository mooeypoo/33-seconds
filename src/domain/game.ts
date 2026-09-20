import { Viper } from './combat/viper';
import type { DomainEvent } from './shared/events';
import type { InputIntent } from './shared/intent';
import { TICK_SECONDS } from './shared/time';
import type { GameView } from './views';

/**
 * The whole simulation behind one entry point: `tick(intent)` mutates state and returns the facts
 * that happened (ADR-0001 D2). It knows nothing about frames, pause, rendering, or input devices,
 * which is what lets it run in tests and in the balance harness (ADR-0001 D13).
 */
export class Game {
  private readonly viper = new Viper();
  private ticks = 0;

  /** Advances the simulation by exactly one tick. The only way to change domain state. */
  tick(intent: InputIntent): readonly DomainEvent[] {
    const events: DomainEvent[] = [];

    if (this.ticks === 0) {
      events.push({ type: 'ViperSpawned', x: this.viper.x, y: this.viper.y });
    }

    this.viper.steer(intent.moveX, intent.moveY, TICK_SECONDS);
    this.ticks += 1;

    return events;
  }

  /** A read-only snapshot for presenters. Cheap: it reads live state, it does not copy it. */
  get view(): GameView {
    const viper = this.viper;
    return {
      tickCount: this.ticks,
      viper: {
        x: viper.x,
        y: viper.y,
        previousX: viper.previousX,
        previousY: viper.previousY,
        velocityX: viper.velocityXUnitsPerSecond,
        velocityY: viper.velocityYUnitsPerSecond,
      },
    };
  }
}

/**
 * Creates a game. This is the seam the headless balance harness will use (ADR-0001 D13): it takes
 * no browser, no engine, and no clock. Seed and tier profile arrive with the first spawns and
 * tunables in M2.
 */
export function createGame(): Game {
  return new Game();
}
