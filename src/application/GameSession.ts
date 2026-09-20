import { createGame, type Game } from '../domain/game';
import type { DomainEvent } from '../domain/shared/events';
import { IDLE_INTENT } from '../domain/shared/intent';
import { TICK_SECONDS } from '../domain/shared/time';
import type { GameView } from '../domain/views';
import type { InputPort } from './ports/InputPort';

/**
 * Where the run is. `resuming` is the 3-2-1 countdown that pause ends with (PRD 13.3): the
 * simulation is still frozen, so it behaves like `paused` as far as the domain is concerned.
 */
export type SessionPhase = 'title' | 'running' | 'paused' | 'resuming';

/** Why the session paused. Shown to the player, because a pause that looks like a freeze is scary. */
export type PauseReason = 'player' | 'tab-hidden' | 'window-blurred' | 'pointer-cancelled' | 'orientation-changed';

export interface SessionStatus {
  readonly phase: SessionPhase;
  readonly pauseReason: PauseReason | null;
  /** Whole seconds still on the resume countdown, or 0 when it is not counting. */
  readonly countdownSeconds: number;
}

export interface FrameResult {
  /** Facts the domain emitted during this frame's ticks, in order. */
  readonly events: readonly DomainEvent[];
  /** How far the frame sits between the last two ticks, 0..1, for render interpolation. */
  readonly interpolationAlpha: number;
  readonly ticksAdvanced: number;
}

/** A frame longer than this is treated as a stall (a breakpoint, a backgrounded tab) and discarded. */
export const MAX_FRAME_SECONDS = 0.25;

/** Catch-up limit per frame (ADR-0001 D2): a slow device slows down instead of spiralling. */
export const MAX_CATCH_UP_TICKS = 3;

export const RESUME_COUNTDOWN_SECONDS = 3;

const NO_FRAME: FrameResult = { events: [], interpolationAlpha: 0, ticksAdvanced: 0 };

/**
 * Owns the loop, the phase, and pause. The domain never learns that pause exists: pausing simply
 * stops feeding it ticks (ADR-0001 D7).
 */
export class GameSession {
  private readonly game: Game = createGame();
  private readonly input: InputPort;
  private readonly listeners = new Set<(status: SessionStatus) => void>();

  private phase: SessionPhase = 'title';
  private reason: PauseReason | null = null;
  private accumulatorSeconds = 0;
  private countdownRemainingSeconds = 0;
  private pendingEvents: DomainEvent[] = [];

  constructor(input: InputPort) {
    this.input = input;
  }

  get status(): SessionStatus {
    return {
      phase: this.phase,
      pauseReason: this.reason,
      countdownSeconds: Math.ceil(this.countdownRemainingSeconds),
    };
  }

  get view(): GameView {
    return this.game.view;
  }

  /** Subscribe to phase changes. Returns an unsubscribe function. */
  subscribe(listener: (status: SessionStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  /** Leaves the title screen. Also the first user gesture, which is when audio may start (D12). */
  start(): void {
    if (this.phase !== 'title') return;
    this.phase = 'running';
    this.reason = null;
    this.accumulatorSeconds = 0;
    this.input.clear();
    this.publish();
  }

  /** Pauses from a player action or from an automatic trigger. Ignored unless a run is going. */
  pause(reason: PauseReason): void {
    if (this.phase !== 'running' && this.phase !== 'resuming') return;
    this.phase = 'paused';
    this.reason = reason;
    this.countdownRemainingSeconds = 0;
    // Held keys and a phantom stick must not survive the pause (PRD 13.3).
    this.input.clear();
    this.publish();
  }

  /** Starts the 3-2-1 countdown. The simulation stays frozen until it finishes. */
  requestResume(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'resuming';
    this.countdownRemainingSeconds = RESUME_COUNTDOWN_SECONDS;
    this.input.clear();
    this.publish();
  }

  /**
   * Leaves Recovering. There is no timer on this (PRD 5.1). Ignored unless a run is going and
   * the domain is actually recovering, so Pause cannot skip a cycle.
   */
  continueFromJump(): void {
    if (this.phase !== 'running') return;
    this.pendingEvents.push(...this.game.continueFromJump());
  }

  /** True while the domain is not being ticked. */
  get isFrozen(): boolean {
    return this.phase !== 'running';
  }

  /**
   * Drives one rendered frame.
   *
   * @param frameSeconds real time since the previous frame
   */
  advance(frameSeconds: number): FrameResult {
    const delta = clampFrameSeconds(frameSeconds);

    if (this.phase === 'resuming') {
      this.countdownRemainingSeconds -= delta;
      if (this.countdownRemainingSeconds <= 0) {
        this.countdownRemainingSeconds = 0;
        this.phase = 'running';
        this.reason = null;
        // Start the loop from zero, so resuming never hands the domain a backlog of ticks.
        this.accumulatorSeconds = 0;
        this.input.clear();
      }
      this.publish();
      return NO_FRAME;
    }

    if (this.phase !== 'running') return NO_FRAME;

    const events: DomainEvent[] = this.pendingEvents;
    this.pendingEvents = [];

    this.accumulatorSeconds += delta;

    const dueTicks = Math.floor(this.accumulatorSeconds / TICK_SECONDS);
    const ticksToRun = Math.min(dueTicks, MAX_CATCH_UP_TICKS);

    for (let i = 0; i < ticksToRun; i++) {
      events.push(...this.game.tick(this.input.readIntent()));
    }

    this.accumulatorSeconds -= ticksToRun * TICK_SECONDS;
    if (dueTicks > ticksToRun) {
      // Throw the backlog away instead of letting it queue up: on a slow device the game runs
      // slower than real time, which is honest, rather than spiralling to catch up.
      this.accumulatorSeconds %= TICK_SECONDS;
    }

    return {
      events,
      interpolationAlpha: this.accumulatorSeconds / TICK_SECONDS,
      ticksAdvanced: ticksToRun,
    };
  }

  private publish(): void {
    const status = this.status;
    for (const listener of this.listeners) listener(status);
  }
}

function clampFrameSeconds(frameSeconds: number): number {
  if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return 0;
  return Math.min(frameSeconds, MAX_FRAME_SECONDS);
}

/** An input port that never asks for anything, for tests and for headless runs. */
export const IDLE_INPUT: InputPort = {
  readIntent: () => IDLE_INTENT,
  clear: () => {},
};
