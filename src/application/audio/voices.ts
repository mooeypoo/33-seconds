import voicesRaw from '../../content/voices.json';
import { isSpeaker, type BanterSpeaker } from '../banter/lines';
import { parseZzfxParameters, type ZzfxParameters } from './soundBank';

/**
 * Character voices (EXPERIMENTAL, PRD 14.3): each speaker's indistinct radio chatter, the "wawawa"
 * under a comms line. A voice is a handful of ZzFX syllables plus how to string them (`babble.ts`).
 * A run plays them only when the player turns Character voices on.
 */
export interface Voice {
  /** The voice's middle pitch. Each syllable's own frequency slot is ignored and replaced by this. */
  readonly pitchHz: number;
  /** How far a syllable wanders from `pitchHz`, either way. */
  readonly pitchRangeSemitones: number;
  /** Added to the last syllable of a phrase: negative falls like a statement, positive rises. */
  readonly phraseEndSemitones: number;
  /** Syllables in one phrase, rolled per phrase, both ends included. */
  readonly syllablesPerPhrase: readonly [number, number];
  readonly syllableGapSeconds: number;
  readonly phraseGapSeconds: number;
  readonly syllables: readonly ZzfxParameters[];
  /** Labels for the sound test page ("oh", "wa"), one per syllable, or none. They change nothing. */
  readonly syllableNames: readonly string[];
}

/** The radio every voice goes through: a telephone-ish band and a little saturation. */
export interface RadioSettings {
  readonly lowCutHz: number;
  readonly highCutHz: number;
  /** 0 is clean. 1 is as crunchy as the file allows, which is still well short of distortion. */
  readonly drive: number;
}

export interface ParsedVoiceBank {
  readonly voices: ReadonlyMap<BanterSpeaker, Voice>;
  readonly radio: RadioSettings;
  /** One sentence per rejected entry, for `check:content`. */
  readonly problems: readonly string[];
}

/** Used when the file's radio block is missing or rejected, so the page still plays something sane. */
export const DEFAULT_RADIO: RadioSettings = { lowCutHz: 300, highCutHz: 3400, drive: 0.2 };

/**
 * The ranges a voice may be written in. They are wide on purpose: they catch a typo (a pitch of
 * 9500, a two-second gap), not a taste the owner has not had yet.
 */
const PITCH_HZ = [40, 800] as const;
const PITCH_RANGE_SEMITONES = [0, 12] as const;
const PHRASE_END_SEMITONES = [-12, 12] as const;
const SYLLABLES_PER_PHRASE = [1, 12] as const;
const SYLLABLE_GAP_SECONDS = [0, 0.5] as const;
const PHRASE_GAP_SECONDS = [0, 1.5] as const;
const SYLLABLE_COUNT = [1, 8] as const;
/** Longer than this is a note, not a syllable, and usually a whole sound pasted by mistake. */
export const SYLLABLE_MAX_SECONDS = 0.25;
const LOW_CUT_HZ = [20, 2000] as const;
const HIGH_CUT_HZ = [500, 12000] as const;
const DRIVE = [0, 1] as const;

/** ZzFX slots that make a syllable's length, with ZzFX's defaults for an empty slot. */
const LENGTH_SLOTS: readonly (readonly [slot: number, fallback: number])[] = [
  [3, 0], // attack
  [4, 0], // sustain
  [5, 0.1], // release
  [16, 0], // delay
  [18, 0], // decay
];

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function inRange(value: unknown, [min, max]: readonly [number, number]): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function syllableSeconds(parameters: ZzfxParameters): number {
  return LENGTH_SLOTS.reduce((sum, [slot, fallback]) => sum + (parameters[slot] ?? fallback), 0);
}

function parseVoice(fields: Record<string, unknown>): Voice | string {
  const numbers: [key: string, range: readonly [number, number]][] = [
    ['pitchHz', PITCH_HZ],
    ['pitchRangeSemitones', PITCH_RANGE_SEMITONES],
    ['phraseEndSemitones', PHRASE_END_SEMITONES],
    ['syllableGapSeconds', SYLLABLE_GAP_SECONDS],
    ['phraseGapSeconds', PHRASE_GAP_SECONDS],
  ];
  for (const [key, [min, max]] of numbers) {
    if (!inRange(fields[key], [min, max])) return `needs ${key} between ${String(min)} and ${String(max)}`;
  }

  const phrase = fields.syllablesPerPhrase;
  const [fewest, most] = SYLLABLES_PER_PHRASE;
  if (
    !Array.isArray(phrase) ||
    phrase.length !== 2 ||
    !phrase.every((count) => Number.isInteger(count) && inRange(count, SYLLABLES_PER_PHRASE)) ||
    (phrase[0] as number) > (phrase[1] as number)
  ) {
    return `needs syllablesPerPhrase as [fewest, most], whole numbers from ${String(fewest)} to ${String(most)}`;
  }

  const rawSyllables = fields.syllables;
  const [minSyllables, maxSyllables] = SYLLABLE_COUNT;
  if (!Array.isArray(rawSyllables) || rawSyllables.length < minSyllables || rawSyllables.length > maxSyllables) {
    return `needs ${String(minSyllables)} to ${String(maxSyllables)} syllables`;
  }
  const syllables: ZzfxParameters[] = [];
  for (const [index, raw] of rawSyllables.entries()) {
    const parameters = parseZzfxParameters(raw);
    if (typeof parameters === 'string') return `syllable ${String(index)} ${parameters}`;
    const seconds = syllableSeconds(parameters);
    if (seconds > SYLLABLE_MAX_SECONDS) {
      return `syllable ${String(index)} lasts ${seconds.toFixed(2)} s; keep a syllable under ${String(SYLLABLE_MAX_SECONDS)} s`;
    }
    syllables.push(parameters);
  }

  const names = fields.syllableNames ?? [];
  if (!Array.isArray(names) || !names.every((name) => typeof name === 'string')) {
    return 'needs syllableNames as a list of words, or none';
  }
  if (names.length > 0 && names.length !== syllables.length) {
    return `names ${String(names.length)} syllables but has ${String(syllables.length)}`;
  }

  return {
    pitchHz: fields.pitchHz as number,
    pitchRangeSemitones: fields.pitchRangeSemitones as number,
    phraseEndSemitones: fields.phraseEndSemitones as number,
    syllablesPerPhrase: [phrase[0] as number, phrase[1] as number],
    syllableGapSeconds: fields.syllableGapSeconds as number,
    phraseGapSeconds: fields.phraseGapSeconds as number,
    syllables,
    syllableNames: names,
  };
}

function parseRadio(raw: unknown): RadioSettings | string {
  const fields = record(raw);
  if (!inRange(fields.lowCutHz, LOW_CUT_HZ)) return `needs lowCutHz between ${String(LOW_CUT_HZ[0])} and ${String(LOW_CUT_HZ[1])}`;
  if (!inRange(fields.highCutHz, HIGH_CUT_HZ)) return `needs highCutHz between ${String(HIGH_CUT_HZ[0])} and ${String(HIGH_CUT_HZ[1])}`;
  if (fields.lowCutHz >= fields.highCutHz) return 'needs lowCutHz below highCutHz';
  if (!inRange(fields.drive, DRIVE)) return 'needs drive between 0 and 1';
  return { lowCutHz: fields.lowCutHz, highCutHz: fields.highCutHz, drive: fields.drive };
}

/** Like the sound bank: a bad entry is skipped and named, so `check:content` can fail on it. */
export function parseVoiceBank(raw: unknown): ParsedVoiceBank {
  const voices = new Map<BanterSpeaker, Voice>();
  const problems: string[] = [];
  const file = record(raw);

  const radio = parseRadio(file.radio);
  if (typeof radio === 'string') problems.push(`radio ${radio}`);

  const entries = file.voices;
  if (!Array.isArray(entries)) {
    problems.push('voices.json needs a "voices" array');
    return { voices, radio: typeof radio === 'string' ? DEFAULT_RADIO : radio, problems };
  }

  for (const [index, entry] of entries.entries()) {
    const fields = record(entry);
    const label = typeof fields.speaker === 'string' ? `"${fields.speaker}"` : `entry ${String(index)}`;
    if (!isSpeaker(fields.speaker)) {
      problems.push(`${label} is not a known speaker`);
      continue;
    }
    if (voices.has(fields.speaker)) {
      problems.push(`${label} appears twice`);
      continue;
    }
    const voice = parseVoice(fields);
    if (typeof voice === 'string') {
      problems.push(`${label} ${voice}`);
      continue;
    }
    voices.set(fields.speaker, voice);
  }
  return { voices, radio: typeof radio === 'string' ? DEFAULT_RADIO : radio, problems };
}

/** The game's voices and radio, read once. Bad entries are skipped here; the content check names them. */
export const VOICE_BANK: ParsedVoiceBank = parseVoiceBank(voicesRaw);
