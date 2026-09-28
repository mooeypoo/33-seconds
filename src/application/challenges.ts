import contentRaw from '../content/challenges.json';
import { CHALLENGE_PRESETS, challengePreset } from '../balance/challenges';
import type { CycleProfile, TierId } from '../domain/balance/profile';
import type { RandomStream } from '../domain/shared/random';
import { fillEnding } from './endings';

/**
 * Challenges as the player sees them (PRD 11.1, ADR-0004): the numbers from
 * `balance/challenges.json` and the words from `content/challenges.json`, joined by id. A challenge
 * without its words is not offered; `check:content` names it. Text renders as text, never as HTML.
 */
export interface ChallengeInfo {
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
}

/** What a session needs to launch one. */
export interface ChallengeLaunch {
  readonly key: string;
  readonly tier: TierId;
  readonly profile: CycleProfile;
}

/** What a finished challenge run carries, on the end screen and in a share link. */
export interface ChallengeTag {
  readonly key: string;
  readonly verdictId: string;
}

export interface VerdictLine {
  readonly id: string;
  readonly text: string;
}

export interface VerdictBand {
  /** The lowest score this band covers. */
  readonly atLeast: number;
  readonly lines: readonly VerdictLine[];
}

interface ChallengeWords extends ChallengeInfo {
  readonly verdicts: readonly VerdictBand[];
}

export const CHALLENGE_NAME_MAX_CHARACTERS = 32;
export const CHALLENGE_BLURB_MAX_CHARACTERS = 140;
export const VERDICT_MAX_CHARACTERS = 100;
export const VERDICT_ID_PATTERN = /^[a-z0-9-]{1,24}$/;

/** A shared link can outlive its challenge. It still shows, under this name, with nothing to play. */
const RETIRED_NAME = 'A retired challenge';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
}

/**
 * One challenge's words, and what was wrong with them. The runtime keeps what is usable; the
 * content check fails on any problem.
 */
export function parseChallengeWords(key: string, raw: unknown): { words: ChallengeWords | null; problems: string[] } {
  const problems: string[] = [];
  const entry = record(raw);
  const name = text(entry.name, CHALLENGE_NAME_MAX_CHARACTERS);
  const blurb = text(entry.blurb, CHALLENGE_BLURB_MAX_CHARACTERS);
  if (!name) problems.push(`${key}.name must be plain text up to ${String(CHALLENGE_NAME_MAX_CHARACTERS)} characters`);
  if (!blurb) problems.push(`${key}.blurb must be plain text up to ${String(CHALLENGE_BLURB_MAX_CHARACTERS)} characters`);
  const bands: VerdictBand[] = [];
  const seen = new Set<string>();
  const rawBands: unknown[] = Array.isArray(entry.verdicts) ? entry.verdicts : [];
  rawBands.forEach((rawBand, bandIndex) => {
    const where = `${key}.verdicts[${String(bandIndex)}]`;
    const band = record(rawBand);
    const atLeast = band.atLeast;
    const previous = bands[bands.length - 1];
    if (typeof atLeast !== 'number' || !Number.isInteger(atLeast) || atLeast < 0) {
      problems.push(`${where}.atLeast must be a whole number, 0 or more`);
      return;
    }
    if (previous ? atLeast <= previous.atLeast : atLeast !== 0) {
      problems.push(`${where}.atLeast must be ${previous ? 'higher than the band before' : '0 for the first band'}`);
      return;
    }
    const lines: VerdictLine[] = [];
    const rawLines: unknown[] = Array.isArray(band.lines) ? band.lines : [];
    rawLines.forEach((rawLine, lineIndex) => {
      const line = record(rawLine);
      const id = line.id;
      const words = text(line.text, VERDICT_MAX_CHARACTERS);
      if (typeof id !== 'string' || !VERDICT_ID_PATTERN.test(id) || seen.has(id)) {
        problems.push(`${where}.lines[${String(lineIndex)}].id must be a new id of up to 24 lowercase letters, digits, and dashes`);
        return;
      }
      if (!words) {
        problems.push(`${where}.lines[${String(lineIndex)}].text must be plain text up to ${String(VERDICT_MAX_CHARACTERS)} characters`);
        return;
      }
      seen.add(id);
      lines.push({ id, text: words });
    });
    if (lines.length === 0) problems.push(`${where} needs at least one line`);
    else bands.push({ atLeast, lines });
  });
  if (bands.length === 0) problems.push(`${key}.verdicts needs at least one band, starting at 0`);
  const words = name && blurb && bands.length > 0 ? { key, name, blurb, verdicts: bands } : null;
  return { words, problems };
}

function loadWords(): ReadonlyMap<string, ChallengeWords> {
  const entries = record(record(contentRaw).challenges);
  const loaded = new Map<string, ChallengeWords>();
  for (const key of Object.keys(CHALLENGE_PRESETS)) {
    const { words } = parseChallengeWords(key, entries[key]);
    if (words) loaded.set(key, words);
  }
  return loaded;
}

const WORDS = loadWords();

/** The challenges the title offers, in the order `balance/challenges.json` lists them. */
export function listChallenges(): readonly ChallengeInfo[] {
  return [...WORDS.values()].map(({ key, name, blurb }) => ({ key, name, blurb }));
}

/** Null for a key this version cannot play: unknown, or missing its words. */
export function challengeLaunch(key: string): ChallengeLaunch | null {
  const preset = challengePreset(key);
  if (!preset || !WORDS.has(key)) return null;
  return { key, tier: preset.tier, profile: preset.profile };
}

export function challengeName(key: string): string {
  return WORDS.get(key)?.name ?? RETIRED_NAME;
}

function bandFor(bands: readonly VerdictBand[], score: number): VerdictBand | undefined {
  let chosen = bands[0];
  for (const band of bands) if (score >= band.atLeast) chosen = band;
  return chosen;
}

/** A verdict for a run that just ended, from the band its score reached. Empty if the challenge has none. */
export function pickVerdict(key: string, score: number, random: RandomStream): string {
  const band = bandFor(WORDS.get(key)?.verdicts ?? [], score);
  if (!band) return '';
  return band.lines[random.index(band.lines.length)]?.id ?? '';
}

/**
 * The verdict a result names, filled in. A link can outlive its line (the content pass cuts it), so
 * an unknown id shows the first line of the band the score reached. Null for a retired challenge.
 */
export function verdictText(tag: ChallengeTag, score: number, cycles: number): string | null {
  const bands = WORDS.get(tag.key)?.verdicts;
  if (!bands) return null;
  const line = bands.flatMap((band) => band.lines).find((candidate) => candidate.id === tag.verdictId) ?? bandFor(bands, score)?.lines[0];
  return line ? fillEnding(line.text, { score, cycles }) : null;
}

export type RivalOutcome = 'beat' | 'tied' | 'short';

export interface RivalComparison {
  readonly outcome: RivalOutcome;
  readonly yours: number;
  readonly theirs: number;
}

/**
 * Beat this (PRD 11.1): your challenge run against the shared one. Only the same challenge compares;
 * anything else is null, so a mismatch shows nothing rather than a misleading number.
 */
export function compareWithRival(
  mine: { readonly score: number; readonly challenge: ChallengeTag | null },
  rival: { readonly score: number; readonly challenge: ChallengeTag | null },
): RivalComparison | null {
  if (!mine.challenge || !rival.challenge || mine.challenge.key !== rival.challenge.key) return null;
  const outcome: RivalOutcome = mine.score > rival.score ? 'beat' : mine.score === rival.score ? 'tied' : 'short';
  return { outcome, yours: mine.score, theirs: rival.score };
}
