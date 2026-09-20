import type { DomainEvent } from '../../domain/shared/events';
import type { GameView } from '../../domain/views';

/**
 * One presenter per bounded context (ADR-0001 D4). A presenter turns domain events and read-only
 * state into sprites, effects, and sound. It never mutates the domain, and the scene shell knows
 * presenters only through this interface.
 */
export interface Presenter {
  /** React to a fact the domain reported. */
  onEvent(event: DomainEvent): void;

  /**
   * Match the visuals to domain state, once per rendered frame.
   *
   * @param alpha 0..1 position between the previous tick and the current one, for interpolation
   */
  sync(view: GameView, alpha: number): void;
}
