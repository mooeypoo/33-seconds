import { describe, expect, it } from 'vitest';
import { babble, GAP_JITTER, type SampleBuilder } from '../src/application/audio/babble';
import { DEFAULT_RADIO, SYLLABLE_MAX_SECONDS, parseVoiceBank, type Voice } from '../src/application/audio/voices';
import { createRandomStream } from '../src/domain/shared/random';

/**
 * Character voices (EXPERIMENTAL, PRD 14.3). The loader must name a bad voice rather than play it,
 * and the babbler must stay reproducible from a seed, keep its rhythm inside the written ranges, and
 * always finish.
 */

const RADIO = { lowCutHz: 300, highCutHz: 3400, drive: 0.2, level: 0.4 };
const VOICE = {
  speaker: 'adama',
  pitchHz: 100,
  pitchRangeSemitones: 2,
  phraseEndSemitones: -4,
  syllablesPerPhrase: [2, 4],
  syllableGapSeconds: 0.05,
  phraseGapSeconds: 0.3,
  syllables: [[0.5, 0, 0, 0.01, 0.05, 0.03, 2]],
};

function parse(...voices: unknown[]): ReturnType<typeof parseVoiceBank> {
  return parseVoiceBank({ radio: RADIO, voices });
}

describe('the voice bank', () => {
  it('reads a voice, with syllables in either form sounds.json accepts', () => {
    const { voices, problems } = parse({ ...VOICE, syllables: [[0.5, null, 0, 0.01, 0.05, 0.03], 'zzfx(...[.4,,,.01,.05,.03])'] });
    expect(problems).toEqual([]);
    expect(voices.get('adama')?.syllables).toEqual([
      [0.5, undefined, 0, 0.01, 0.05, 0.03],
      [0.4, undefined, undefined, 0.01, 0.05, 0.03],
    ]);
  });

  it.each([
    ['an unknown speaker', { ...VOICE, speaker: 'lee' }, /not a known speaker/],
    ['a pitch out of range', { ...VOICE, pitchHz: 9500 }, /pitchHz/],
    ['a missing gap', { ...VOICE, phraseGapSeconds: undefined }, /phraseGapSeconds/],
    ['a phrase range the wrong way round', { ...VOICE, syllablesPerPhrase: [4, 2] }, /syllablesPerPhrase/],
    ['a phrase of half a syllable', { ...VOICE, syllablesPerPhrase: [1.5, 3] }, /syllablesPerPhrase/],
    ['no syllables', { ...VOICE, syllables: [] }, /syllables/],
    ['a syllable that is not a zzfx array', { ...VOICE, syllables: [[0.5, 'loud']] }, /syllable 0 .*position 1/],
    ['a whole sound pasted as a syllable', { ...VOICE, syllables: [[0.5, 0, 0, 0.1, 0.3, 0.2]] }, /syllable 0 lasts 0.60 s/],
    // An empty release slot is ZzFX's default of 0.1 s, so the length check must count it.
    ['a syllable made long by a default', { ...VOICE, syllables: [[0.5, 0, 0, 0, SYLLABLE_MAX_SECONDS]] }, /lasts/],
    ['names that do not match the syllables', { ...VOICE, syllableNames: ['oh', 'ah'] }, /names 2 syllables but has 1/],
  ])('rejects %s and names it', (_what, voice, message) => {
    const { voices, problems } = parse(voice);
    expect(voices.size).toBe(0);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(message);
  });

  it('rejects a second voice for the same speaker and keeps the first', () => {
    const { voices, problems } = parse(VOICE, { ...VOICE, pitchHz: 300 });
    expect(voices.get('adama')?.pitchHz).toBe(100);
    expect(problems).toEqual(['"adama" appears twice']);
  });

  it('names a bad radio and falls back to the default one, keeping the voices', () => {
    const { voices, radio, problems } = parseVoiceBank({ radio: { ...RADIO, lowCutHz: 5000 }, voices: [VOICE] });
    expect(radio).toEqual(DEFAULT_RADIO);
    expect(voices.size).toBe(1);
    expect(problems).toEqual(['radio needs lowCutHz between 20 and 2000']);
  });

  it('names a voice level that is missing or out of range, since it sets how loud every voice is', () => {
    for (const level of [undefined, -0.1, 1.5, '0.4']) {
      const { radio, problems } = parseVoiceBank({ radio: { ...RADIO, level }, voices: [VOICE] });
      expect(radio).toEqual(DEFAULT_RADIO);
      expect(problems).toEqual(['radio needs level between 0 and 1']);
    }
  });
});

/** One syllable as the babbler sees it: a run of ones, so gaps (zeros) and syllables are easy to tell apart. */
const SYLLABLE_SAMPLES = 40;
const SAMPLE_RATE = 1000;

interface Call {
  readonly randomness: number | undefined;
  readonly frequency: number;
}

function recordingBuilder(calls: Call[]): SampleBuilder {
  return (...parameters) => {
    calls.push({ randomness: parameters[1], frequency: parameters[2] ?? Number.NaN });
    return new Array<number>(SYLLABLE_SAMPLES).fill(1);
  };
}

const voice: Voice = {
  pitchHz: 100,
  pitchRangeSemitones: 2,
  phraseEndSemitones: -4,
  syllablesPerPhrase: [2, 4],
  syllableGapSeconds: 0.05,
  phraseGapSeconds: 0.3,
  syllables: [[0.5], [0.4]],
  syllableNames: [],
};

/** The lengths of the silent runs between syllables, in samples, ignoring whatever trails the last one. */
function gaps(stream: Float32Array): number[] {
  const found: number[] = [];
  let run = 0;
  let seenSound = false;
  for (const sample of stream) {
    if (sample === 0) {
      run += 1;
    } else {
      if (seenSound && run > 0) found.push(run);
      run = 0;
      seenSound = true;
    }
  }
  return found;
}

/** The lengths of the sounding runs (syllables), in samples, in order. */
function soundRuns(stream: Float32Array): number[] {
  const found: number[] = [];
  let run = 0;
  for (const sample of stream) {
    if (sample !== 0) {
      run += 1;
    } else if (run > 0) {
      found.push(run);
      run = 0;
    }
  }
  if (run > 0) found.push(run);
  return found;
}

describe('babble', () => {
  it('is the same stream from the same seed, and a different one from another', () => {
    const render = (seed: number): Float32Array =>
      babble(voice, 3, SAMPLE_RATE, createRandomStream(seed), (...parameters) =>
        new Array<number>(SYLLABLE_SAMPLES).fill(parameters[2] ?? 0),
      );
    expect(render(11)).toEqual(render(11));
    expect(render(11)).not.toEqual(render(12));
  });

  it('switches off ZzFX\'s own pitch wobble, which reads Math.random and would break the seed', () => {
    const calls: Call[] = [];
    babble({ ...voice, syllables: [[0.5, 0.9]] }, 2, SAMPLE_RATE, createRandomStream(1), recordingBuilder(calls));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.randomness === 0)).toBe(true);
  });

  it('is exactly as long as asked, even when that cuts a syllable', () => {
    for (const seconds of [0, 0.001, 0.123, 2.5]) {
      const stream = babble(voice, seconds, SAMPLE_RATE, createRandomStream(3), recordingBuilder([]));
      expect(stream.length).toBe(Math.round(seconds * SAMPLE_RATE));
    }
  });

  it('keeps short gaps between syllables and long ones between phrases, each within its jitter', () => {
    const allPhraseLengths = new Set<number>();
    for (let seed = 0; seed < 20; seed += 1) {
      const found = gaps(babble(voice, 5, SAMPLE_RATE, createRandomStream(seed), recordingBuilder([])));
      const short = [voice.syllableGapSeconds * (1 - GAP_JITTER), voice.syllableGapSeconds * (1 + GAP_JITTER)];
      const long = [voice.phraseGapSeconds * (1 - GAP_JITTER), voice.phraseGapSeconds * (1 + GAP_JITTER)];
      const within = ([min, max]: number[], samples: number): boolean =>
        samples >= Math.floor((min ?? 0) * SAMPLE_RATE) && samples <= Math.ceil((max ?? 0) * SAMPLE_RATE);
      expect(found.every((gap) => within(short, gap) || within(long, gap))).toBe(true);

      // Phrases: count the syllables between long gaps. Only whole phrases count (not the first or last).
      const phraseLengths: number[] = [];
      let syllables = 1;
      for (const gap of found) {
        if (within(long, gap)) {
          phraseLengths.push(syllables);
          syllables = 1;
        } else {
          syllables += 1;
        }
      }
      expect(phraseLengths.length).toBeGreaterThan(2);
      const [fewest, most] = voice.syllablesPerPhrase;
      expect(phraseLengths.every((count) => count >= fewest && count <= most)).toBe(true);
      for (const count of phraseLengths) allPhraseLengths.add(count);
    }
    // Both ends of the written range happen, so neither is lost to an off-by-one.
    const [fewest, most] = voice.syllablesPerPhrase;
    expect(allPhraseLengths).toContain(fewest);
    expect(allPhraseLengths).toContain(most);
  });

  it('keeps each syllable inside its pitch range, and bends the last of a phrase', () => {
    // A syllable is resampled to its pitch, so its length tells the pitch: an octave up is half as long.
    const written = 400;
    const flat = (): number[] => new Array<number>(written).fill(1);
    const stream = babble(voice, 8, SAMPLE_RATE, createRandomStream(9), flat);
    const runs = soundRuns(stream).slice(0, -1); // The last one may be cut by the stream's end.
    const found = gaps(stream);
    const longGap = voice.phraseGapSeconds * (1 - GAP_JITTER) * SAMPLE_RATE;
    const range = voice.pitchRangeSemitones;
    const bend = voice.phraseEndSemitones;
    // One sample of rounding on 400 is well under a tenth of a semitone.
    const slack = 0.1;
    runs.forEach((length, index) => {
      const semitones = -12 * Math.log2((length - 1) / (written - 1));
      const phraseEnd = (found[index] ?? 0) >= longGap;
      const [low, high] = phraseEnd ? [bend - range, bend + range] : [-range, range];
      expect(semitones).toBeGreaterThanOrEqual(low - slack);
      expect(semitones).toBeLessThanOrEqual(high + slack);
    });
    expect(found.some((gap) => gap >= longGap)).toBe(true);
  });

  it('synthesizes each syllable once per stream, at the voice\'s own pitch', () => {
    const calls: Call[] = [];
    babble(voice, 5, SAMPLE_RATE, createRandomStream(4), recordingBuilder(calls));
    expect(calls).toHaveLength(voice.syllables.length);
    expect(calls.every((call) => call.frequency === voice.pitchHz)).toBe(true);
  });

  it('finishes with no gaps and a builder that returns nothing', () => {
    const silent: Voice = { ...voice, syllableGapSeconds: 0, phraseGapSeconds: 0 };
    const stream = babble(silent, 1, SAMPLE_RATE, createRandomStream(5), () => []);
    expect(stream.length).toBe(SAMPLE_RATE);
  });
});
