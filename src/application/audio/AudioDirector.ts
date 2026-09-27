import type { DomainEvent } from '../../domain/shared/events';
import { createRandomStream, type RandomStream } from '../../domain/shared/random';
import type { CycleView } from '../../domain/views';
import type { CommsLine } from '../banter/Banter';
import type { BanterSpeaker } from '../banter/lines';
import type { AudioPort } from '../ports/AudioPort';
import type { SoundId } from './soundIds';
import { VOICE_BANK, type Voice as CharacterVoice } from './voices';

/**
 * Two plays of one sound closer than this are one sound. A kill chain on the same frame, or a
 * swarm of shield hits, would otherwise stack into a single loud click.
 */
export const MIN_REPEAT_SECONDS = 0.05;
/** At most this many copies of one sound at once. */
export const MAX_VOICES_PER_SOUND = 3;
/** At most this many sounds at once, whatever they are. */
export const MAX_VOICES = 8;
/** Repeated sounds play up to this much higher or lower (0.04 is 4%), so a chain does not drone. */
export const PITCH_JITTER = 0.04;
/** The spool is called at these whole seconds left, like the comms line (PRD 12.2). */
export const SPOOL_SOUNDS: Readonly<Record<number, SoundId>> = { 5: 'spool_5s', 2: 'spool_2s' };

/**
 * A voice talks for the start of its line, not the whole time it is up (PRD 14.3): a short line
 * gets a word or two, a long one a couple of phrases. Chatter for all 4–8 s would wear thin.
 */
export const VOICE_BASE_SECONDS = 0.6;
export const VOICE_SECONDS_PER_CHARACTER = 0.04;
export const VOICE_MIN_SECONDS = 0.8;
export const VOICE_MAX_SECONDS = 2.5;

export function voiceSeconds(text: string): number {
  const seconds = VOICE_BASE_SECONDS + VOICE_SECONDS_PER_CHARACTER * text.length;
  return Math.min(VOICE_MAX_SECONDS, Math.max(VOICE_MIN_SECONDS, seconds));
}

/** Sounds that come in bursts and get the pitch jitter. The rest play exactly as written. */
const REPEATING = new Set<SoundId>([
  'raider_destroyed',
  'heavy_destroyed',
  'missile_launch',
  'viper_hit',
  'fleet_hit',
  'raider_returned',
  'shield_hit',
]);

/**
 * The cue table: which domain fact makes which sound (ADR-0002 3.5). Anything not listed is
 * silent, including player auto-fire, Cylon shots, and a hit on a Raider that does not kill it.
 * Every one of these already has a visual (PRD 15), so the game is whole when muted.
 */
function soundFor(event: DomainEvent): SoundId | null {
  switch (event.type) {
    case 'RaiderDestroyed':
      return event.heavy ? 'heavy_destroyed' : 'raider_destroyed';
    case 'ResurrectionShipDestroyed':
      return 'ship_destroyed';
    case 'MissileFired':
      return 'missile_launch';
    case 'ViperHit':
      return 'viper_hit';
    case 'ViperEjected':
      return 'viper_eject';
    case 'FleetHit':
      return 'fleet_hit';
    case 'RaiderSpawned':
      return event.returned ? 'raider_returned' : null;
    case 'ResurrectionShipArrived':
      return 'ship_arrived';
    case 'ResurrectionShipHit':
      return event.shielded ? 'shield_hit' : null;
    case 'CyclePhaseChanged':
      return event.phase === 'jumping' ? 'jump' : null;
    case 'SpeechStarted':
      return 'speech';
    case 'RunWon':
      return 'run_won';
    case 'RunLost':
      return 'run_lost';
    default:
      return null;
  }
}

/** Separate from gameplay and from banter (ADR-0001 D3): a pitch wobble never changes a run. */
function audioSeed(runSeed: number): number {
  return (runSeed ^ 0xa0d10) >>> 0;
}

/** The voices' own stream, so turning voices on or off never changes the effects' pitch wobble. */
function voiceSeed(runSeed: number): number {
  return (runSeed ^ 0x70ce5) >>> 0;
}

/** One stream seed per line: any 32-bit value. */
const SEED_RANGE = 2 ** 32;

interface Voice {
  readonly id: SoundId;
  readonly endsAt: number;
}

/**
 * Decides what plays: the cue table, the repeat limits, mute and volume, and when sound is held
 * (ADR-0002 3.5). It keeps its own clock from the frames the session ran, so pause freezes it, and
 * it never reads the wall clock.
 */
export class AudioDirector {
  private random: RandomStream;
  private clock = 0;
  private voices: Voice[] = [];
  private readonly lastPlayedAt = new Map<SoundId, number>();
  private lastSpoolSecond: number | null = null;
  private unlocked = false;
  private muted = false;
  private held = false;
  private pageHidden = false;
  private suspended = false;
  private voiceRandom: RandomStream;
  private characterVoicesOn = false;
  /** The comms line last seen, voiced or not. A new object is a new line, even with the same text. */
  private lastLine: CommsLine | null = null;

  constructor(
    private readonly port: AudioPort,
    runSeed = 0,
    private readonly characterVoices: ReadonlyMap<BanterSpeaker, CharacterVoice> = VOICE_BANK.voices,
  ) {
    this.random = createRandomStream(audioSeed(runSeed));
    this.voiceRandom = createRandomStream(voiceSeed(runSeed));
  }

  /** A new run: fresh jitter, no limits carried over. Mute, volume, and unlock stay. */
  reset(runSeed: number): void {
    this.random = createRandomStream(audioSeed(runSeed));
    this.clock = 0;
    this.voices = [];
    this.lastPlayedAt.clear();
    this.lastSpoolSecond = null;
    this.voiceRandom = createRandomStream(voiceSeed(runSeed));
    this.lastLine = null;
    this.port.hush();
  }

  /** Only from inside a user gesture (PRD 14.1). Before this, nothing is ever asked to play. */
  unlock(): void {
    this.unlocked = true;
    this.port.unlock();
    this.syncSuspended(true);
  }

  /**
   * Mute is instant and total, and a muted game asks for nothing, so unmuting has no backlog to
   * dump (PRD 14.1). `volume` is 0..1.
   */
  setLevel(muted: boolean, volume: number): void {
    this.muted = muted;
    this.port.setMasterGain(muted ? 0 : Math.min(1, Math.max(0, volume)));
    // A voice cut by mute stays cut: unmuting must not bring back the rest of it (PRD 14.1).
    if (muted) this.port.hush();
  }

  /** The Character voices setting (PRD 14.3). Off stops a voice mid-word. */
  setCharacterVoices(on: boolean): void {
    this.characterVoicesOn = on;
    if (!on) this.port.hush();
  }

  /**
   * The comms strip as the player sees it. A new line hushes the last voice and, when voices are
   * on, starts its speaker's for `voiceSeconds`. Critical lines stay voiceless so the spool sounds
   * are heard (PRD 14.3). A voice is never started into a pause, a hidden tab, or mute, so nothing
   * waits to play when they end.
   */
  noteComms(line: CommsLine | null): void {
    if (line === this.lastLine) return;
    this.lastLine = line;
    this.port.hush();
    if (line === null || line.critical || !this.characterVoicesOn) return;
    if (!this.unlocked || this.muted || this.held || this.pageHidden) return;
    const voice = this.characterVoices.get(line.speaker);
    if (!voice) return;
    this.port.speak(voice, voiceSeconds(line.text), Math.floor(this.voiceRandom.next() * SEED_RANGE));
  }

  /** The session is paused, or counting back in from a pause. */
  setHeld(held: boolean): void {
    this.held = held;
    this.syncSuspended();
  }

  /**
   * The tab is hidden. Separate from pause, because the Recovering sheet does not pause (PRD 13.3)
   * and a hidden tab must still go quiet.
   */
  setPageHidden(hidden: boolean): void {
    this.pageHidden = hidden;
    this.syncSuspended();
  }

  /** One running frame: its events, where the cycle is, and how long it took. */
  noteFrame(
    events: readonly DomainEvent[],
    cycle: Pick<CycleView, 'phase' | 'secondsRemaining'>,
    deltaSeconds: number,
  ): void {
    this.clock += Math.max(0, deltaSeconds);
    for (const event of events) {
      const id = soundFor(event);
      if (id) this.cue(id);
    }
    this.noteSpool(cycle);
  }

  /** Plays one sound if the rules allow it now. The overlay uses this for the card pick. */
  cue(id: SoundId): void {
    if (!this.unlocked || this.muted || this.held || this.pageHidden) return;

    this.voices = this.voices.filter((voice) => voice.endsAt > this.clock);
    const last = this.lastPlayedAt.get(id);
    if (last !== undefined && this.clock - last < MIN_REPEAT_SECONDS) return;
    if (this.voices.length >= MAX_VOICES) return;
    if (this.voices.filter((voice) => voice.id === id).length >= MAX_VOICES_PER_SOUND) return;

    const rate = REPEATING.has(id) ? 1 + this.random.between(-PITCH_JITTER, PITCH_JITTER) : 1;
    const seconds = this.port.play(id, rate);
    this.lastPlayedAt.set(id, this.clock);
    if (seconds > 0) this.voices.push({ id, endsAt: this.clock + seconds });
  }

  /** The 5 and 2 calls, once each per spool, even if a pause lands on the second. */
  private noteSpool(cycle: Pick<CycleView, 'phase' | 'secondsRemaining'>): void {
    if (cycle.phase !== 'spooling') {
      this.lastSpoolSecond = null;
      return;
    }
    if (cycle.secondsRemaining === this.lastSpoolSecond) return;
    this.lastSpoolSecond = cycle.secondsRemaining;
    const id = SPOOL_SOUNDS[cycle.secondsRemaining];
    if (id) this.cue(id);
  }

  private syncSuspended(force = false): void {
    const suspended = this.held || this.pageHidden;
    if (!this.unlocked || (!force && suspended === this.suspended)) return;
    this.suspended = suspended;
    this.port.setSuspended(suspended);
  }
}
