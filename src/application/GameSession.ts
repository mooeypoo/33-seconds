import { DEFAULT_PLAY_TIER, profileFor } from '../balance/tiers';
import { Banter, banterSeed, type CommsLine } from './banter/Banter';
import { BANTER_LINES } from './banter/lines';
import type { TierId } from '../domain/balance/profile';
import { createGame, DEFAULT_RUN_SEED, type Game, type GameOptions } from '../domain/game';
import type { DomainEvent } from '../domain/shared/events';
import { IDLE_INTENT } from '../domain/shared/intent';
import { createRandomStream } from '../domain/shared/random';
import { TICK_SECONDS } from '../domain/shared/time';
import type { GameView } from '../domain/views';
import type { InputPort } from './ports/InputPort';

/**
 * Where the run is. `resuming` is the 3-2-1 countdown that pause ends with (PRD 13.3): the
 * simulation is still frozen, so it behaves like `paused` as far as the domain is concerned.
 */
export type SessionPhase = 'title' | 'running' | 'paused' | 'resuming' | 'won' | 'lost';

/** Why the session paused. Shown to the player, because a pause that looks like a freeze is scary. */
export type PauseReason = 'player' | 'tab-hidden' | 'window-blurred' | 'pointer-cancelled' | 'orientation-changed';

export interface SessionStatus {
  readonly phase: SessionPhase;
  readonly pauseReason: PauseReason | null;
  /** Whole seconds still on the resume countdown, or 0 when it is not counting. */
  readonly countdownSeconds: number;
  /** The one comms line on screen, or null. Pause freezes it (PRD 12.2). */
  readonly comms: CommsLine | null;
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
  private readonly options: GameOptions;
  private game: Game;
  private readonly input: InputPort;
  private readonly listeners = new Set<(status: SessionStatus) => void>();

  private phase: SessionPhase = 'title';
  private reason: PauseReason | null = null;
  private accumulatorSeconds = 0;
  private countdownRemainingSeconds = 0;
  private pendingEvents: DomainEvent[] = [];
  private banter: Banter;

  constructor(input: InputPort, options: GameOptions = {}) {
    this.input = input;
    this.options = options;
    this.game = createGame(options);
    this.banter = this.freshBanter();
  }

  get status(): SessionStatus {
    return {
      phase: this.phase,
      pauseReason: this.reason,
      countdownSeconds: Math.ceil(this.countdownRemainingSeconds),
      comms: this.phase === 'title' ? null : this.banter.line,
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
  start(tier: TierId = DEFAULT_PLAY_TIER): void {
    if (this.phase !== 'title') return;
    this.game = createGame({ ...this.options, tierProfile: profileFor(tier) });
    this.banter = this.freshBanter();
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
   * the domain is actually recovering, so Pause cannot skip a cycle. Play uses pickUpgrade;
   * tests that only need the next cycle still call this.
   */
  continueFromJump(): void {
    if (this.phase !== 'running') return;
    this.pendingEvents.push(...this.game.continueFromJump());
  }

  /** Picks a Recovering card and starts the next cycle. The pick is Continue (PRD 5.1). */
  pickUpgrade(cardId: string): void {
    if (this.phase !== 'running') return;
    this.pendingEvents.push(...this.game.pickUpgrade(cardId));
  }

  /** One free reroll of the Recovering table. */
  rerollOffer(): void {
    if (this.phase !== 'running') return;
    this.pendingEvents.push(...this.game.rerollOffer());
  }

  /** Leaves the win or lose screen for the title. The next Launch starts a new run. */
  returnToTitle(): void {
    if (this.phase !== 'won' && this.phase !== 'lost') return;
    this.phase = 'title';
    this.reason = null;
    this.banter = this.freshBanter();
    this.input.clear();
    this.publish();
  }

  /**
   * Discards the current run from the pause menu (PRD 13.3). Not the lose screen's Retry, and
   * not available while the resume countdown is already going.
   */
  abandonRun(): void {
    if (this.phase !== 'paused') return;
    this.phase = 'title';
    this.reason = null;
    this.countdownRemainingSeconds = 0;
    this.accumulatorSeconds = 0;
    this.pendingEvents = [];
    this.banter = this.freshBanter();
    this.input.clear();
    this.publish();
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

    let ticksRun = 0;
    for (let i = 0; i < ticksToRun; i++) {
      const tickEvents = this.game.tick(this.input.readIntent());
      events.push(...tickEvents);
      ticksRun += 1;
      if (tickEvents.some((event) => event.type === 'RunWon' || event.type === 'RunLost')) {
        this.phase = tickEvents.some((event) => event.type === 'RunLost') ? 'lost' : 'won';
        this.reason = null;
        // Frozen on the win or lose tick: leftover catch-up must not keep simulating.
        this.accumulatorSeconds = 0;
        this.publish();
        break;
      }
    }

    if (this.phase === 'running') {
      this.accumulatorSeconds -= ticksRun * TICK_SECONDS;
      if (dueTicks > ticksToRun) {
        // Throw the backlog away instead of letting it queue up: on a slow device the game runs
        // slower than real time, which is honest, rather than spiralling to catch up.
        this.accumulatorSeconds %= TICK_SECONDS;
      }
    }

    this.noteBanter(events, delta);

    return {
      events,
      interpolationAlpha: this.accumulatorSeconds / TICK_SECONDS,
      ticksAdvanced: ticksRun,
    };
  }

  private freshBanter(): Banter {
    const seed = this.options.seed ?? DEFAULT_RUN_SEED;
    return new Banter(createRandomStream(banterSeed(seed)), BANTER_LINES);
  }

  /** Comms follows the game clock: this is only called from a frame that was running. */
  private noteBanter(events: readonly DomainEvent[], deltaSeconds: number): void {
    const before = this.banter.line?.text ?? null;
    const view = this.game.view;
    const ships = view.fleet.ships;
    // ASSUMPTION: Dualla's "ready" count is healthy civilian hulls. There is no separate FTL checklist yet.
    this.banter.observe(events, {
      secondsRemaining: view.cycle.secondsRemaining,
      hull: view.viper.hp,
      spoolPercent: Math.round(view.cycle.spoolProgress * 100),
      readyShips: ships.filter((ship) => ship.healthy).length,
      shipTotal: ships.length,
      offeredCardIds: view.upgradeOffer?.cardIds ?? [],
    });
    this.banter.advance(deltaSeconds);
    if ((this.banter.line?.text ?? null) !== before) this.publish();
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
