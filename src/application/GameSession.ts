import { SCORE_WEIGHTS } from '../balance/scoring';
import { DEFAULT_PLAY_TIER, profileFor } from '../balance/tiers';
import { AudioDirector } from './audio/AudioDirector';
import type { CommsLine } from './banter/Banter';
import { CommsDirector } from './banter/CommsDirector';
import { fleetNamesForRun } from './fleetRoster';
import type { TierId } from '../domain/balance/profile';
import { createGame, DEFAULT_RUN_SEED, type Game, type GameOptions } from '../domain/game';
import { PHONE_PLAYFIELD, type Playfield } from '../domain/shared/world';
import type { DomainEvent } from '../domain/shared/events';
import { IDLE_INTENT } from '../domain/shared/intent';
import { TICK_SECONDS } from '../domain/shared/time';
import type { GameView } from '../domain/views';
import { SILENT_AUDIO, type AudioPort } from './ports/AudioPort';
import type { InputPort } from './ports/InputPort';
import type { SeedSource } from './ports/SeedSource';
import { buildHudViewModel, type HudViewModel } from './HudViewModel';
import { createRandomStream } from '../domain/shared/random';
import { RunTally } from '../domain/scoring/score';
import { pickEnding, pickReaction } from './endings';
import { buildRunResult, type RunResult } from './runResult';

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
  /** The one comms line on screen, or null. A Recovering scene takes the strip. Pause freezes it. */
  readonly comms: CommsLine | null;
  /** Past comms lines this run, oldest first, newest last (PRD 12.2). Empty on the title. */
  readonly commsLog: readonly CommsLine[];
  /** One name per fleet-line hull, in order, for this run (PRD 7.4). */
  readonly fleetNames: readonly string[];
  /** The Recovering sheet is up. Focus loss does not cover it with the pause menu. */
  readonly choosingUpgrade: boolean;
  /** The finished run, for the end screen (PRD 5.4). Set only while the phase is won or lost. */
  readonly result: RunResult | null;
}

export interface FrameResult {
  /** Facts the domain emitted during this frame's ticks, in order. */
  readonly events: readonly DomainEvent[];
  /** How far the frame sits between the last two ticks, 0..1, for render interpolation. */
  readonly interpolationAlpha: number;
  readonly ticksAdvanced: number;
}

export interface SessionOptions extends GameOptions {
  /**
   * Draws each new run's seed (ADR-0002 D1). Ignored when `seed` is set, which is how tests pin a
   * run. Without either, every run uses the default seed.
   */
  readonly seedSource?: SeedSource;
  /** Where sound goes (ADR-0001 D12). Without one the game is silent, which is how tests run. */
  readonly audio?: AudioPort;
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
  private readonly options: SessionOptions;
  /** This run's seed. Gameplay and comms each derive their own stream from it. */
  private runSeed: number;
  /** Drawn once per run from the roster stream. */
  private fleetNames: readonly string[];
  private game: Game;
  private readonly input: InputPort;
  private readonly listeners = new Set<(status: SessionStatus) => void>();
  private readonly hudListeners = new Set<(hud: HudViewModel) => void>();

  private phase: SessionPhase = 'title';
  private reason: PauseReason | null = null;
  private accumulatorSeconds = 0;
  private countdownRemainingSeconds = 0;
  private pendingEvents: DomainEvent[] = [];
  private readonly comms: CommsDirector;
  private readonly sound: AudioDirector;
  /** A card waiting out the 3-2-1 after Apply. The fight starts when that countdown ends. */
  private pendingUpgradeId: string | null = null;
  /** Watches this run's events for the score. Replaced on every Launch. */
  private tally = new RunTally();
  private result: RunResult | null = null;

  constructor(input: InputPort, options: SessionOptions = {}) {
    this.input = input;
    this.options = options;
    this.runSeed = options.seed ?? DEFAULT_RUN_SEED;
    this.game = createGame({ ...options, seed: this.runSeed });
    this.comms = new CommsDirector(this.runSeed);
    this.sound = new AudioDirector(options.audio ?? SILENT_AUDIO, this.runSeed);
    this.fleetNames = fleetNamesForRun(this.runSeed);
  }

  get status(): SessionStatus {
    return {
      phase: this.phase,
      pauseReason: this.reason,
      countdownSeconds: Math.ceil(this.countdownRemainingSeconds),
      comms: this.phase === 'title' ? null : this.comms.line,
      commsLog: this.phase === 'title' ? [] : [...this.comms.log],
      fleetNames: this.fleetNames,
      choosingUpgrade:
        this.phase === 'running' && this.pendingUpgradeId === null && this.game.view.cycle.phase === 'recovering',
      result: this.phase === 'won' || this.phase === 'lost' ? this.result : null,
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

  /**
   * Subscribe to the HUD model (ADR-0002 D2). It is published after every frame and whenever a new
   * run starts, so the overlay never waits on the renderer. Returns an unsubscribe function.
   */
  subscribeHud(listener: (hud: HudViewModel) => void): () => void {
    this.hudListeners.add(listener);
    listener(buildHudViewModel(this.game.view));
    return () => this.hudListeners.delete(listener);
  }

  /** Leaves the title screen. Also the first user gesture, which is when audio may start (D12). */
  start(tier: TierId = DEFAULT_PLAY_TIER, playfield?: Playfield): void {
    if (this.phase !== 'title') return;
    const lane = playfield ?? this.options.playfield ?? PHONE_PLAYFIELD;
    this.runSeed = this.options.seed ?? this.options.seedSource?.() ?? DEFAULT_RUN_SEED;
    this.fleetNames = fleetNamesForRun(this.runSeed);
    this.game = createGame({ ...this.options, seed: this.runSeed, tierProfile: profileFor(tier), playfield: lane });
    this.resetChatter();
    this.tally = new RunTally();
    this.result = null;
    // Launch is the player's first deliberate gesture: the first moment sound may exist (PRD 14.1).
    this.sound.unlock();
    this.phase = 'running';
    this.reason = null;
    this.accumulatorSeconds = 0;
    this.input.clear();
    this.publish();
    this.publishHud();
  }

  /** Mute and master volume (0..1) from player settings. Applies at once, mid-sound included. */
  setSoundLevel(muted: boolean, volume: number): void {
    this.sound.setLevel(muted, volume);
  }

  /**
   * The tab was hidden or shown. Sound stops while it is hidden, even on the Recovering sheet,
   * which the session does not pause (PRD 13.3).
   */
  setPageHidden(hidden: boolean): void {
    this.sound.setPageHidden(hidden);
  }

  /** A Recovering card was highlighted (not applied). Only a sound: the choice is still open. */
  cardHighlighted(): void {
    if (this.status.choosingUpgrade) this.sound.cue('card_select');
  }

  /**
   * Pauses from a player action or from an automatic trigger. Ignored unless a run is going.
   * The Recovering sheet already waits for Apply, so nothing covers it: not a blur, a hidden tab,
   * Esc, or the Pause button. Phaser still pauses its own loop while the tab is hidden. A blur
   * that leaves the tab visible does not. The 3-2-1 after Apply can still pause.
   */
  pause(reason: PauseReason): void {
    if (this.phase !== 'running' && this.phase !== 'resuming') return;
    if (this.status.choosingUpgrade) return;
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
   * Leaves Recovering without a card. Ignored unless a run is going and the domain is actually
   * recovering, so Pause cannot skip a cycle. Play uses pickUpgrade; tests that only need the
   * next cycle still call this.
   */
  continueFromJump(): void {
    if (this.phase !== 'running') return;
    this.comms.endRecovering();
    this.pendingEvents.push(...this.game.continueFromJump());
  }

  /**
   * Arms a Recovering card and starts the 3-2-1 (PRD 5.1). The sheet's highlight does not call
   * this. The card is applied when the countdown ends, so a mouse pick can become a keyboard fight.
   * Ignored unless that card is on the table.
   */
  pickUpgrade(cardId: string): void {
    if (this.phase !== 'running') return;
    if (this.game.view.cycle.phase !== 'recovering') return;
    const offered = this.game.view.upgradeOffer?.cardIds ?? [];
    if (!offered.some((id) => id === cardId)) return;
    this.pendingUpgradeId = cardId;
    this.sound.cue('card_apply');
    this.phase = 'resuming';
    this.reason = null;
    this.countdownRemainingSeconds = RESUME_COUNTDOWN_SECONDS;
    this.accumulatorSeconds = 0;
    this.input.clear();
    this.publish();
  }

  /** One free reroll of the Recovering table (PRD 10.1). The sheet clears its own highlight. */
  rerollOffer(): void {
    if (this.phase !== 'running') return;
    this.pendingEvents.push(...this.game.rerollOffer());
  }

  /** Leaves the win or lose screen for the title. The next Launch starts a new run. */
  returnToTitle(): void {
    if (this.phase !== 'won' && this.phase !== 'lost') return;
    this.phase = 'title';
    this.reason = null;
    this.resetChatter();
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
    this.resetChatter();
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
    const frame = this.advanceFrame(frameSeconds);
    this.publishHud();
    return frame;
  }

  private advanceFrame(frameSeconds: number): FrameResult {
    const delta = clampFrameSeconds(frameSeconds);

    if (this.phase === 'resuming') {
      this.countdownRemainingSeconds -= delta;
      if (this.countdownRemainingSeconds <= 0) {
        this.countdownRemainingSeconds = 0;
        const cardId = this.pendingUpgradeId;
        this.pendingUpgradeId = null;
        if (cardId !== null) {
          this.comms.endRecovering();
          this.pendingEvents.push(...this.game.pickUpgrade(cardId));
        }
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
      this.tally.note(tickEvents);
      ticksRun += 1;
      if (tickEvents.some((event) => event.type === 'RunWon' || event.type === 'RunLost')) {
        this.phase = tickEvents.some((event) => event.type === 'RunLost') ? 'lost' : 'won';
        this.result = this.finishRun(this.phase === 'won');
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
    this.sound.noteFrame(events, this.game.view.cycle, delta);

    return {
      events,
      interpolationAlpha: this.accumulatorSeconds / TICK_SECONDS,
      ticksAdvanced: ticksRun,
    };
  }

  /** Scores the run on the tick it ended. The headline comes from its own stream, so it never touches play. */
  private finishRun(won: boolean): RunResult {
    const view = this.game.view;
    const random = createRandomStream(endingSeed(this.runSeed));
    const headline = pickEnding(won ? 'won' : 'lost', random);
    return buildRunResult(view, this.tally.facts(view, won), SCORE_WEIGHTS, headline.id, pickReaction(random));
  }

  private resetChatter(): void {
    this.comms.reset(this.runSeed);
    this.sound.reset(this.runSeed);
    this.pendingUpgradeId = null;
  }

  /** Comms follows the game clock: this is only called from a frame that was running. */
  private noteBanter(events: readonly DomainEvent[], deltaSeconds: number): void {
    if (this.comms.noteFrame(events, this.game.view, deltaSeconds)) this.publish();
  }

  private publish(): void {
    // Paused, or counting back in from a pause: sound holds where it was (ADR-0001 D7). The 3-2-1
    // after Apply is not a pause, so the Apply sound plays through it.
    this.sound.setHeld(this.phase === 'paused' || (this.phase === 'resuming' && this.pendingUpgradeId === null));
    const status = this.status;
    for (const listener of this.listeners) listener(status);
  }

  private publishHud(): void {
    if (this.hudListeners.size === 0) return;
    const hud = buildHudViewModel(this.game.view);
    for (const listener of this.hudListeners) listener(hud);
  }
}

function endingSeed(runSeed: number): number {
  return (runSeed ^ 0xe4d1e) >>> 0;
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
