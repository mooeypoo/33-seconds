import { SCORE_WEIGHTS } from '../balance/scoring';
import { DEFAULT_PLAY_TIER, profileFor } from '../balance/tiers';
import { TRAINING_PRESET } from '../balance/training';
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
import { LessonDirector, type LessonCard } from './training/LessonDirector';
import { speakBeats, TRAINING_SCRIPT, type SpokenBeat } from './training/trainingScript';

/**
 * Where the run is. `resuming` is the 3-2-1 countdown that pause ends with (PRD 13.3): the
 * simulation is still frozen, so it behaves like `paused` as far as the domain is concerned.
 */
export type SessionPhase = 'title' | 'running' | 'paused' | 'resuming' | 'won' | 'lost';

/** Why the session paused. Shown to the player, because a pause that looks like a freeze is scary. */
export type PauseReason =
  | 'player'
  | 'tab-hidden'
  | 'window-blurred'
  | 'pointer-cancelled'
  | 'orientation-changed'
  /** A Training Run lesson is up. Dismissing it is the resume (PRD 5.5). */
  | 'lesson';

/** The end of a Training Run: Tyrol's word and grade, and what the sim never got to (PRD 5.5). */
export interface TrainingDebrief {
  readonly outcome: 'won' | 'lost';
  readonly heading: string;
  readonly beats: readonly SpokenBeat[];
  readonly grade: string;
  readonly recapIntro: string;
  readonly recaps: readonly string[];
}

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
  /** The finished run, for the end screen (PRD 5.4). Set only while a real run is won or lost. */
  readonly result: RunResult | null;
  /** This is a Training Run (PRD 5.5). */
  readonly training: boolean;
  /** The running drill's name for the status row, or null outside training or for an unnamed drill. */
  readonly drill: string | null;
  /** The lesson on screen, or null. A pausing lesson holds the clock until it is dismissed. */
  readonly lesson: LessonCard | null;
  /** Set only while a Training Run is won or lost. It replaces the scored end screen. */
  readonly debrief: TrainingDebrief | null;
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
  /** Set for a Training Run only. */
  private lessons: LessonDirector | null = null;
  private lesson: LessonCard | null = null;
  /** The Training Run drill the swarm is following (balance/training.json). */
  private drill: string | null = null;
  private debrief: TrainingDebrief | null = null;

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
      training: this.lessons !== null && this.phase !== 'title',
      drill: this.lessons !== null && this.drill !== null ? (TRAINING_SCRIPT.drillNames[this.drill] ?? null) : null,
      lesson: this.lesson,
      debrief: this.phase === 'won' || this.phase === 'lost' ? this.debrief : null,
    };
  }

  get view(): GameView {
    return this.game.view;
  }

  /** The lesson on screen, for the canvas outlines. Cheaper than `status`, which is read per frame. */
  get lessonCard(): LessonCard | null {
    return this.lesson;
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
    this.launch(tier, playfield, {}, false);
  }

  /**
   * Leaves the title for a Training Run (PRD 5.5): the tier and ship numbers from `training.json`,
   * and the opening lessons up before the first tick, so the clock is held while Tyrol talks.
   */
  startTraining(playfield?: Playfield): void {
    const preset = TRAINING_PRESET;
    this.launch(
      preset.tier,
      playfield,
      {
        resurrectionShipArrivesCycle: preset.resurrectionShipArrivesCycle,
        resurrectionShipVulnerableCycle: preset.resurrectionShipVulnerableCycle,
        resurrectionShipHitPoints: preset.resurrectionShipHitPoints,
      },
      true,
    );
  }

  private launch(tier: TierId, playfield: Playfield | undefined, extra: GameOptions, training: boolean): void {
    if (this.phase !== 'title') return;
    const lane = playfield ?? this.options.playfield ?? PHONE_PLAYFIELD;
    const profile = profileFor(tier);
    this.runSeed = this.options.seed ?? this.options.seedSource?.() ?? DEFAULT_RUN_SEED;
    this.fleetNames = fleetNamesForRun(this.runSeed);
    // A test's own ship numbers win over the preset, so a training test can end in one shot.
    this.game = createGame({ ...extra, ...this.options, seed: this.runSeed, tierProfile: profile, playfield: lane });
    this.resetChatter();
    this.tally = new RunTally();
    this.result = null;
    this.clearTraining();
    // Launch is the player's first deliberate gesture: the first moment sound may exist (PRD 14.1).
    this.sound.unlock();
    this.phase = 'running';
    this.reason = null;
    this.accumulatorSeconds = 0;
    this.input.clear();
    if (training) {
      this.lessons = new LessonDirector(TRAINING_SCRIPT, profile.fleetCycleDamageCap);
      this.startDrill(TRAINING_PRESET.firstDrill);
      this.lessons.start();
      this.showLesson(this.lessons.take(this.game.view, true));
    }
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

  /** Starts the 3-2-1 countdown. The simulation stays frozen until it finishes. On a lesson, dismisses it. */
  requestResume(): void {
    if (this.phase !== 'paused') return;
    if (this.reason === 'lesson') {
      this.dismissLesson();
      return;
    }
    this.phase = 'resuming';
    this.countdownRemainingSeconds = RESUME_COUNTDOWN_SECONDS;
    this.input.clear();
    this.publish();
  }

  /**
   * Got it, on a lesson (PRD 5.5). The next lesson already due follows at once, with the clock still
   * held. When none is left, a paused fight counts 3-2-1 like any other resume. Over the pick sheet
   * nothing was paused, so the sheet simply comes back.
   */
  dismissLesson(): void {
    const current = this.lesson;
    if (!current || !this.lessons) return;
    this.lesson = null;
    if (current.startsDrill !== null) this.startDrill(current.startsDrill);
    const next = this.lessons.take(this.game.view, true);
    if (next) {
      this.showLesson(next);
    } else if (current.pauses && this.phase === 'paused') {
      this.phase = 'resuming';
      this.reason = null;
      this.countdownRemainingSeconds = RESUME_COUNTDOWN_SECONDS;
      this.input.clear();
    }
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
    if (this.phase !== 'running' || this.lesson) return;
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
    if (this.phase !== 'running' || this.lesson) return;
    this.pendingEvents.push(...this.game.rerollOffer());
  }

  /** Leaves the win or lose screen for the title. The next Launch starts a new run. */
  returnToTitle(): void {
    if (this.phase !== 'won' && this.phase !== 'lost') return;
    this.phase = 'title';
    this.reason = null;
    this.clearTraining();
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
    this.clearTraining();
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
        this.lessons?.noteResumed();
      }
      this.publish();
      return NO_FRAME;
    }

    if (this.phase !== 'running') return NO_FRAME;

    const events: DomainEvent[] = this.pendingEvents;
    this.pendingEvents = [];
    this.lessons?.noteEvents(events, this.game.view);

    this.accumulatorSeconds += delta;

    const dueTicks = Math.floor(this.accumulatorSeconds / TICK_SECONDS);
    const ticksToRun = Math.min(dueTicks, MAX_CATCH_UP_TICKS);

    let ticksRun = 0;
    for (let i = 0; i < ticksToRun; i++) {
      const tickEvents = this.game.tick(this.input.readIntent());
      events.push(...tickEvents);
      this.tally.note(tickEvents);
      this.lessons?.noteTick(tickEvents, this.game.view);
      ticksRun += 1;
      if (tickEvents.some((event) => event.type === 'RunWon' || event.type === 'RunLost')) {
        this.phase = tickEvents.some((event) => event.type === 'RunLost') ? 'lost' : 'won';
        this.lesson = null;
        if (this.lessons) this.debrief = this.finishTraining(this.phase === 'won', this.lessons);
        else this.result = this.finishRun(this.phase === 'won');
        this.reason = null;
        // Frozen on the win or lose tick: leftover catch-up must not keep simulating.
        this.accumulatorSeconds = 0;
        this.publish();
        break;
      }
      // A lesson stops the fight on the tick it came due, so the moment it names is still on screen.
      const card = this.lessons && !this.lesson ? this.lessons.take(this.game.view, false) : null;
      if (card) {
        this.showLesson(card);
        if (card.pauses) break;
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

  /** Tyrol's word, a grade from the cosmetic stream, and the lessons that never came up. */
  private finishTraining(won: boolean, lessons: LessonDirector): TrainingDebrief {
    const script = TRAINING_SCRIPT.debrief;
    const random = createRandomStream(endingSeed(this.runSeed));
    const grade = script.grades.length > 0 ? (script.grades[random.index(script.grades.length)] ?? '') : '';
    return {
      outcome: won ? 'won' : 'lost',
      heading: script.heading,
      beats: speakBeats(script.beats),
      grade,
      recapIntro: script.recapIntro,
      recaps: lessons.recaps(),
    };
  }

  /**
   * Puts a lesson on screen. During the fight that is a pause: nothing ticks until it is dismissed.
   * Over the pick sheet it is not, because the sheet already waits (PRD 13.3).
   */
  private showLesson(card: LessonCard | null): void {
    if (!card) return;
    this.lesson = card;
    if (card.pauses) {
      this.phase = 'paused';
      this.reason = 'lesson';
      this.countdownRemainingSeconds = 0;
      this.accumulatorSeconds = 0;
      this.input.clear();
    }
    this.publish();
  }

  /**
   * Hands the swarm to a drill (PRD 5.5). It takes effect on the next tick, which is always after
   * the lesson that started it has been read. An id the preset does not know changes nothing;
   * `check:content` names it.
   */
  private startDrill(id: string): void {
    const swarm = TRAINING_PRESET.drills[id];
    if (!swarm) return;
    this.drill = id;
    this.game.setSwarmOverride(swarm);
  }

  private clearTraining(): void {
    this.lessons = null;
    this.lesson = null;
    this.drill = null;
    this.debrief = null;
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
