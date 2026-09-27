import { beforeEach, describe, expect, it } from 'vitest';
import {
  AudioDirector,
  VOICE_MAX_SECONDS,
  VOICE_MIN_SECONDS,
  voiceSeconds,
} from '../src/application/audio/AudioDirector';
import type { SoundId } from '../src/application/audio/soundIds';
import { VOICE_BANK, type Voice } from '../src/application/audio/voices';
import type { CommsLine } from '../src/application/banter/Banter';
import type { BanterSpeaker } from '../src/application/banter/lines';
import { GameSession, IDLE_INPUT, type SessionStatus } from '../src/application/GameSession';
import type { AudioPort } from '../src/application/ports/AudioPort';
import type { DomainEvent } from '../src/domain/shared/events';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

/**
 * Character voices (PRD 14.3): a comms line's speaker chatters under it when the player turns
 * voices on. What they sound like is not tested (AGENTS.md); who is asked to talk, when, for how
 * long, and when they are cut off, is.
 */

/** Records what the application asked for, in order, including hushes. */
class RecordingAudio implements AudioPort {
  readonly calls: ({ kind: 'speak'; voice: Voice; seconds: number; seed: number } | { kind: 'hush' })[] = [];
  plays: { id: SoundId; rate: number }[] = [];

  unlock(): void {}
  play(id: SoundId, rate: number): number {
    this.plays.push({ id, rate });
    return 0.2;
  }
  speak(voice: Voice, seconds: number, seed: number): void {
    this.calls.push({ kind: 'speak', voice, seconds, seed });
  }
  hush(): void {
    this.calls.push({ kind: 'hush' });
  }
  setSuspended(): void {}
  setMasterGain(): void {}

  get speaks(): { voice: Voice; seconds: number; seed: number }[] {
    return this.calls.flatMap((call) => (call.kind === 'speak' ? [call] : []));
  }
  /** What happened last: 'hush', or the voice that was asked to talk. */
  get last(): Voice | 'hush' | undefined {
    const call = this.calls.at(-1);
    return call?.kind === 'speak' ? call.voice : call?.kind;
  }
}

const voiceOf = (speaker: BanterSpeaker): Voice => {
  const voice = VOICE_BANK.voices.get(speaker);
  if (!voice) throw new Error(`voices.json has no ${speaker}`);
  return voice;
};

const speakerOf = (voice: Voice): BanterSpeaker | undefined =>
  [...VOICE_BANK.voices].find(([, candidate]) => candidate === voice)?.[0];

function line(speaker: BanterSpeaker, text = 'Hold the line.', critical = false): CommsLine {
  return { speaker, speakerName: speaker, text, critical };
}

let audio: RecordingAudio;
let director: AudioDirector;

beforeEach(() => {
  audio = new RecordingAudio();
  director = new AudioDirector(audio, 7);
  director.unlock();
});

describe('which lines talk', () => {
  it('stays silent by default: voices are an experiment the player opts into', () => {
    director.noteComms(line('adama'));
    expect(audio.speaks).toEqual([]);
  });

  it("starts the new line's speaker, for the line's speaking window", () => {
    director.setCharacterVoices(true);
    const said = line('tigh', 'Get that Viper back in the fight.');
    director.noteComms(said);
    expect(audio.speaks).toHaveLength(1);
    expect(audio.speaks[0]).toMatchObject({ voice: voiceOf('tigh'), seconds: voiceSeconds(said.text) });
  });

  it('keeps critical lines voiceless, so the spool sounds are heard, and still cuts the voice before', () => {
    director.setCharacterVoices(true);
    director.noteComms(line('starbuck'));
    director.noteComms(line('gaeta', 'Jump in 5.', true));
    expect(audio.speaks.map((call) => speakerOf(call.voice))).toEqual(['starbuck']);
    expect(audio.last).toBe('hush');
  });

  it('talks once per line: the same line again is not a new line, and the same words said anew are', () => {
    director.setCharacterVoices(true);
    const said = line('adama', 'Thirty-three.');
    director.noteComms(said);
    director.noteComms(said);
    expect(audio.speaks).toHaveLength(1);

    director.noteComms(line('adama', 'Thirty-three.'));
    expect(audio.speaks).toHaveLength(2);
  });

  it('cuts a voice when its line is replaced, before the next speaker starts', () => {
    director.setCharacterVoices(true);
    director.noteComms(line('baltar'));
    director.noteComms(line('roslin'));
    const kinds = audio.calls.map((call) => (call.kind === 'speak' ? speakerOf(call.voice) : 'hush'));
    expect(kinds.slice(-2)).toEqual(['hush', 'roslin']);
  });

  it('cuts a voice when its line leaves the strip', () => {
    director.setCharacterVoices(true);
    director.noteComms(line('dualla'));
    director.noteComms(null);
    expect(audio.last).toBe('hush');
  });

  it('never talks before Launch, into a pause, into a hidden tab, or while muted', () => {
    const locked = new AudioDirector(audio, 7);
    locked.setCharacterVoices(true);
    locked.noteComms(line('adama'));

    director.setCharacterVoices(true);
    director.setHeld(true);
    director.noteComms(line('adama'));
    director.setHeld(false);
    director.setPageHidden(true);
    director.noteComms(line('starbuck'));
    director.setPageHidden(false);
    director.setLevel(true, 0.7);
    director.noteComms(line('tyrol'));
    expect(audio.speaks).toEqual([]);
  });

  it('cuts the voice on mute and on turning voices off, and does not bring it back on unmute', () => {
    director.setCharacterVoices(true);
    director.noteComms(line('six'));
    director.setLevel(true, 0.7);
    expect(audio.last).toBe('hush');
    director.setLevel(false, 0.7);
    expect(audio.last).toBe('hush');

    director.noteComms(line('gaeta'));
    director.setCharacterVoices(false);
    expect(audio.last).toBe('hush');
    expect(audio.speaks.map((call) => speakerOf(call.voice))).toEqual(['six', 'gaeta']);
  });

  it('stays quiet for a speaker with no voice in the file', () => {
    const voiceless = new AudioDirector(audio, 7, new Map());
    voiceless.unlock();
    voiceless.setCharacterVoices(true);
    voiceless.noteComms(line('adama'));
    expect(audio.speaks).toEqual([]);
  });
});

describe('how long a voice talks', () => {
  it('grows with the line, inside its floor and ceiling', () => {
    expect(voiceSeconds('')).toBe(VOICE_MIN_SECONDS);
    expect(voiceSeconds('x'.repeat(500))).toBe(VOICE_MAX_SECONDS);
    const short = voiceSeconds('Copy that, Galactica.');
    const long = voiceSeconds('Copy that, Galactica. Swinging around for another pass.');
    expect(long).toBeGreaterThan(short);
    for (const text of ['', 'Go.', 'x'.repeat(40), 'x'.repeat(120)]) {
      expect(voiceSeconds(text)).toBeGreaterThanOrEqual(VOICE_MIN_SECONDS);
      expect(voiceSeconds(text)).toBeLessThanOrEqual(VOICE_MAX_SECONDS);
    }
  });
});

describe('voices and the rest of the run', () => {
  it('replays the same voices from the same run seed', () => {
    const seedsFor = (runSeed: number): number[] => {
      const recorder = new RecordingAudio();
      const voiced = new AudioDirector(recorder, runSeed);
      voiced.unlock();
      voiced.setCharacterVoices(true);
      for (const speaker of ['adama', 'starbuck', 'tigh'] as const) voiced.noteComms(line(speaker));
      return recorder.speaks.map((call) => call.seed);
    };
    expect(seedsFor(11)).toEqual(seedsFor(11));
    expect(seedsFor(11)).not.toEqual(seedsFor(12));
  });

  it("never changes the effects' pitch wobble, voices on or off (ADR-0001 D3)", () => {
    const kill: DomainEvent = { type: 'RaiderDestroyed', id: 1, x: 0, y: 0, heavy: false };
    const ratesWith = (voicesOn: boolean): number[] => {
      const recorder = new RecordingAudio();
      const mixed = new AudioDirector(recorder, 5);
      mixed.unlock();
      mixed.setCharacterVoices(voicesOn);
      for (let frame = 0; frame < 20; frame++) {
        mixed.noteComms(line(frame % 2 === 0 ? 'adama' : 'baltar', `Line ${String(frame)}`));
        mixed.noteFrame([kill], { phase: 'building', secondsRemaining: 20 }, 0.1);
      }
      return recorder.plays.map((play) => play.rate);
    };
    expect(ratesWith(true)).toEqual(ratesWith(false));
  });
});

describe('voices in a run', () => {
  let session: GameSession;
  let seen: CommsLine[];

  beforeEach(() => {
    audio = new RecordingAudio();
    session = new GameSession(IDLE_INPUT, { seed: 3, audio });
    seen = [];
    session.subscribe((status: SessionStatus) => {
      if (status.comms && status.comms !== seen.at(-1)) seen.push(status.comms);
    });
  });

  function runSeconds(seconds: number): void {
    for (let i = 0; i < Math.round(seconds * TICKS_PER_SECOND); i++) session.advance(TICK_SECONDS);
  }

  it('voices every line the player sees through a whole cycle, except the critical spool calls', () => {
    session.setCharacterVoices(true);
    session.start();
    runSeconds(40);

    // The seed must reach the spool, or the critical half of this test proves nothing.
    expect(seen.some((said) => said.critical)).toBe(true);
    expect(audio.speaks.map((call) => speakerOf(call.voice))).toEqual(
      seen.filter((said) => !said.critical).map((said) => said.speaker),
    );
  });

  it('stays silent through a whole cycle with voices off', () => {
    session.start();
    runSeconds(40);
    expect(seen.length).toBeGreaterThan(0);
    expect(audio.speaks).toEqual([]);
  });

  it('starts no voice while paused, and cuts the voice when the run is abandoned', () => {
    session.setCharacterVoices(true);
    session.start();
    runSeconds(2);
    expect(audio.speaks.length).toBeGreaterThan(0);

    session.pause('player');
    const spokenBeforePause = audio.speaks.length;
    runSeconds(10);
    expect(audio.speaks).toHaveLength(spokenBeforePause);

    session.abandonRun();
    expect(audio.last).toBe('hush');
  });
});
