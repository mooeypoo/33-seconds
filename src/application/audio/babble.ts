import type { RandomStream } from '../../domain/shared/random';
import type { Voice } from './voices';

/** ZzFX's `buildSamples`, passed in so this file never loads ZzFX (it opens an AudioContext on import). */
export type SampleBuilder = (...parameters: (number | undefined)[]) => ArrayLike<number>;

const RANDOMNESS_SLOT = 1;
const FREQUENCY_SLOT = 2;
const SEMITONES_PER_OCTAVE = 12;
/** Each gap is stretched or squeezed by up to this share, so the rhythm never ticks like a clock. */
export const GAP_JITTER = 0.3;

/**
 * Renders `seconds` of a voice's chatter: its syllables in random order, each at a wandering pitch,
 * with short gaps between syllables and a longer one between phrases. The last syllable of a phrase
 * falls or rises by `phraseEndSemitones`, which is most of what makes gibberish sound like a
 * sentence. The stream stops exactly at `seconds`, even mid-syllable; whoever plays it fades it.
 *
 * Each syllable is synthesized once, at the voice's pitch, and every pitch after that is the same
 * samples read faster or slower, like a sampler. Synthesizing every syllable afresh took about 20 ms
 * per stream on a desktop, more than a frame; resampling is a fraction of that (journal 0062). A
 * higher syllable comes out a little shorter, as a sampler's would.
 *
 * Every choice comes from `random`, so one seed always gives the same stream. ZzFX's own pitch
 * wobble is switched off for that reason: it reads `Math.random` inside.
 */
export function babble(
  voice: Voice,
  seconds: number,
  sampleRate: number,
  random: RandomStream,
  build: SampleBuilder,
): Float32Array {
  const stream = new Float32Array(Math.max(0, Math.round(seconds * sampleRate)));
  const syllables = voice.syllables.map((syllable) => {
    const slots = [...syllable];
    slots[RANDOMNESS_SLOT] = 0;
    slots[FREQUENCY_SLOT] = voice.pitchHz;
    return build(...slots);
  });
  const [fewest, most] = voice.syllablesPerPhrase;
  const rollPhrase = (): number => fewest + random.index(most - fewest + 1);
  const jittered = (gapSeconds: number): number =>
    Math.round(gapSeconds * sampleRate * random.between(1 - GAP_JITTER, 1 + GAP_JITTER));

  let at = 0;
  let left = rollPhrase();
  while (at < stream.length) {
    const source = syllables[random.index(syllables.length)] ?? [];
    left -= 1;
    const phraseEnd = left <= 0;
    const range = voice.pitchRangeSemitones;
    const semitones = random.between(-range, range) + (phraseEnd ? voice.phraseEndSemitones : 0);
    const written = resampleInto(stream, at, source, 2 ** (semitones / SEMITONES_PER_OCTAVE));

    // The gap is already silence: a fresh Float32Array is zeros. Always move on by at least one
    // sample, so a voice with no gaps and an empty syllable cannot spin here forever.
    const gap = jittered(phraseEnd ? voice.phraseGapSeconds : voice.syllableGapSeconds);
    at += Math.max(1, written + gap);
    if (phraseEnd) left = rollPhrase();
  }
  return stream;
}

/**
 * Writes `source` read `rate` times faster (2 is an octave up, and half as long) into `target` from
 * `offset`, with linear interpolation between samples. Stops at the end of `target`. Returns how
 * many samples the syllable takes at this rate, cut or not.
 */
function resampleInto(target: Float32Array, offset: number, source: ArrayLike<number>, rate: number): number {
  const length = Math.floor((source.length - 1) / rate) + 1;
  if (source.length === 0) return 0;
  const end = Math.min(length, target.length - offset);
  for (let index = 0; index < end; index += 1) {
    const position = index * rate;
    const whole = Math.floor(position);
    const before = source[whole] ?? 0;
    const after = source[whole + 1] ?? before;
    target[offset + index] = before + (after - before) * (position - whole);
  }
  return length;
}
