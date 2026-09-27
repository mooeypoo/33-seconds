import type { SoundId } from '../audio/soundIds';
import type { Voice } from '../audio/voices';

/**
 * Sound out (ADR-0001 D12). The application decides what plays and when; the adapter only makes
 * noise. Mute, volume, and the repeat limits are not adapter details, so a swapped engine keeps
 * them.
 *
 * An adapter must never throw: a browser without Web Audio is a silent game, not a broken one.
 */
export interface AudioPort {
  /**
   * Called only from inside a user gesture (the Launch button). This is the first moment an audio
   * context may exist (PRD 14.1). Calling it again is harmless.
   */
  unlock(): void;
  /**
   * Starts one sound at `rate` (1 is as written). Returns how long it will sound, in seconds, or 0
   * when nothing played (not unlocked yet, still loading, or no such sound).
   */
  play(id: SoundId, rate: number): number;
  /**
   * Starts a character voice (PRD 14.3): `seconds` of `voice`'s chatter, rendered from `seed`, through
   * the radio and the same master as every sound. A voice already talking stops first: one at a
   * time, like the comms strip.
   */
  speak(voice: Voice, seconds: number, seed: number): void;
  /** Fades out the voice that is talking, if any, quickly enough to read as a cut. */
  hush(): void;
  /** Freezes or thaws everything already sounding, as the session pauses and resumes. */
  setSuspended(suspended: boolean): void;
  /** 0 is silent. Applied at once, including to sounds already playing. */
  setMasterGain(gain: number): void;
}

/** For tests and headless runs: never makes a sound. */
export const SILENT_AUDIO: AudioPort = {
  unlock: () => {},
  play: () => 0,
  speak: () => {},
  hush: () => {},
  setSuspended: () => {},
  setMasterGain: () => {},
};
