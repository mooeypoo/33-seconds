import soundsRaw from '../../content/sounds.json';
import { isSoundId, type SoundId } from './soundIds';

/**
 * ZzFX 1.3.2 `buildSamples` takes 21 parameters, in this order (checked against the pinned
 * package, not from memory): volume, randomness, frequency, attack, sustain, release, shape,
 * shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush,
 * delay, sustainVolume, decay, tremolo, filter.
 */
export const ZZFX_PARAMETER_COUNT = 21;

/**
 * The loudest a single sound may be written (parameter 0). ZzFX's own default is 1. The player's
 * master volume scales everything below this, so the cap only stops a pasted array from shouting.
 */
export const SOUND_VOLUME_CAP = 1;

/** `undefined` is an empty slot: ZzFX uses its default for that parameter. */
export type ZzfxParameters = readonly (number | undefined)[];

export type SoundBank = ReadonlyMap<SoundId, ZzfxParameters>;

export interface ParsedSoundBank {
  readonly bank: SoundBank;
  /** One sentence per rejected entry, for `check:content`. The game just skips those sounds. */
  readonly problems: readonly string[];
}

/** A plain JSON number, or the Sound Designer's shorthand like `.05` or `-1.2e-3`. */
const NUMBER_TEXT = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Reads one `zzfx` value. Two forms are accepted, so a designer can paste straight in:
 *  - a JSON array of numbers, with `null` for an empty slot;
 *  - the Sound Designer's text, such as `"zzfx(...[,,925,.04,.3])"` or `"[,,925,.04,.3]"`, which is
 *    not valid JSON (holes, leading dots), so it has to travel as a string.
 *
 * Returns the parameters, or the problem as the end of a sentence. Voice syllables (`voices.ts`)
 * use it too, so both files accept exactly the same pastes.
 */
export function parseZzfxParameters(value: unknown): ZzfxParameters | string {
  let slots: unknown[];
  const pasted = typeof value === 'string';
  if (Array.isArray(value)) {
    slots = value;
  } else if (pasted) {
    const match = /\[([^\]]*)\]/.exec(value);
    if (!match) return 'is text without a [ ... ] array in it';
    const body = match[1] ?? '';
    slots = body.trim() === '' ? [] : body.split(',').map((item) => item.trim());
  } else {
    return 'needs a zzfx array or the Sound Designer text';
  }

  if (slots.length === 0) return 'has an empty zzfx array';
  if (slots.length > ZZFX_PARAMETER_COUNT) {
    return `has ${String(slots.length)} zzfx values; ZzFX takes at most ${String(ZZFX_PARAMETER_COUNT)}`;
  }

  const parameters: (number | undefined)[] = [];
  for (const [index, slot] of slots.entries()) {
    // A hole is `null` in JSON and nothing at all in the Designer's text.
    if ((!pasted && slot === null) || (pasted && slot === '')) {
      parameters.push(undefined);
    } else if (typeof slot === 'number' && Number.isFinite(slot)) {
      parameters.push(slot);
    } else if (pasted && typeof slot === 'string' && NUMBER_TEXT.test(slot)) {
      parameters.push(Number(slot));
    } else {
      return `has a zzfx value at position ${String(index)} that is not a number`;
    }
  }

  // An empty volume slot means ZzFX's default of 1.
  const volume = parameters[0] ?? 1;
  if (volume < 0 || volume > SOUND_VOLUME_CAP) {
    return `has volume ${String(volume)}; keep it between 0 and ${String(SOUND_VOLUME_CAP)}`;
  }
  return parameters;
}

/**
 * Treats the file like any other content: a bad entry is skipped (the game stays quiet for that
 * cue) and named in `problems`, which `check:content` turns into a failure.
 */
export function parseSoundBank(raw: unknown): ParsedSoundBank {
  const bank = new Map<SoundId, ZzfxParameters>();
  const problems: string[] = [];
  const entries = raw !== null && typeof raw === 'object' ? (raw as { sounds?: unknown }).sounds : undefined;
  if (!Array.isArray(entries)) return { bank, problems: ['sounds.json needs a "sounds" array'] };

  for (const [index, entry] of entries.entries()) {
    const fields = entry !== null && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
    const label = typeof fields.id === 'string' ? `"${fields.id}"` : `entry ${String(index)}`;
    if (!isSoundId(fields.id)) {
      problems.push(`${label} is not a known sound id`);
      continue;
    }
    if (bank.has(fields.id)) {
      problems.push(`${label} appears twice`);
      continue;
    }
    const parameters = parseZzfxParameters(fields.zzfx);
    if (typeof parameters === 'string') {
      problems.push(`${label} ${parameters}`);
      continue;
    }
    bank.set(fields.id, parameters);
  }
  return { bank, problems };
}

/** The game's sounds, read once. Bad entries are silently skipped here; the content check names them. */
export const SOUND_BANK: SoundBank = parseSoundBank(soundsRaw).bank;
