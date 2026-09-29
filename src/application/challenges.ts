import contentRaw from '../content/challenges.json';
import { CHALLENGE_PRESETS, challengePreset, mutatorOptions, WEEKLY_POOL, type ChallengeRules, weeklyPairKey, type WeeklyPool } from '../balance/challenges';
import type { CycleProfile, TierId } from '../domain/balance/profile';
import { createRandomStream, type RandomStream } from '../domain/shared/random';
import { fillEnding } from './endings';
import { formatIsoWeek, isoWeekOf, parseIsoWeek } from './isoWeek';

/**
 * Challenges as the player sees them (PRD 11.1, ADR-0004): the numbers from
 * `balance/challenges.json` and the words from `content/challenges.json`, joined by id. A challenge
 * without its words is not offered; `check:content` names it. Text renders as text, never as HTML.
 */
export interface ChallengeInfo {
  readonly key: string;
  readonly name: string;
  readonly blurb: string;
  /** What this week changes, one line per change (`Heavy traffic: ...`). Empty for a set challenge. */
  readonly details: readonly string[];
}

/** How a run is scored and how its end reads. Endless has no win: the fleet falling is `held`. */
export type RunScoring = 'story' | 'endless';

/** What a session needs to launch one. */
export interface ChallengeLaunch {
  readonly key: string;
  readonly tier: TierId;
  readonly profile: CycleProfile;
  /** The run options its mutators set (ADR-0004). */
  readonly rules: ChallengeRules;
  /** Endless is scored by the jumps the fleet held, and ends as `held` (PRD 11.1). */
  readonly scoring: RunScoring;
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
  const words = name && blurb && bands.length > 0 ? { key, name, blurb, details: [], verdicts: bands } : null;
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

// ---------- The weekly challenge ----------

export const WEEKLY_KEY_PREFIX = 'weekly:';
export const VARIANT_NAME_MAX_CHARACTERS = 24;
export const VARIANT_LINE_MAX_CHARACTERS = 90;

interface VariantWords {
  readonly name: string;
  readonly line: string;
}

interface WeeklyWords {
  /** With `{week}` for the week's number. */
  readonly name: string;
  readonly blurb: string;
  readonly verdicts: readonly VerdictBand[];
  readonly swarms: ReadonlyMap<string, VariantWords>;
  readonly fleets: ReadonlyMap<string, VariantWords>;
}

function parseVariantWords(
  where: 'swarms' | 'fleets',
  raw: unknown,
  ids: readonly string[],
  problems: string[],
): Map<string, VariantWords> {
  const entries = record(raw);
  const parsed = new Map<string, VariantWords>();
  for (const id of ids) {
    const entry = record(entries[id]);
    const name = text(entry.name, VARIANT_NAME_MAX_CHARACTERS);
    const line = text(entry.line, VARIANT_LINE_MAX_CHARACTERS);
    if (!name || !line) {
      problems.push(
        `weekly.${where}.${id} needs a name up to ${String(VARIANT_NAME_MAX_CHARACTERS)} characters and a line up to ${String(VARIANT_LINE_MAX_CHARACTERS)}`,
      );
    } else parsed.set(id, { name, line });
  }
  for (const id of Object.keys(entries)) {
    if (!ids.includes(id)) problems.push(`weekly.${where}.${id} has no numbers in balance/challenges.json`);
  }
  return parsed;
}

/**
 * The weekly challenge's words, and what was wrong with them. The runtime offers no weekly
 * challenge unless every variant the pool can pick has words; the content check fails on any problem.
 */
export function parseWeeklyWords(raw: unknown, pool: WeeklyPool = WEEKLY_POOL): { words: WeeklyWords | null; problems: string[] } {
  const entry = record(raw);
  const { words: common, problems } = parseChallengeWords('weekly', entry);
  const swarms = parseVariantWords('swarms', entry.swarms, pool.swarms, problems);
  const fleets = parseVariantWords('fleets', entry.fleets, pool.fleets, problems);
  const complete = swarms.size === pool.swarms.length && fleets.size === pool.fleets.length;
  const words = common && complete ? { name: common.name, blurb: common.blurb, verdicts: common.verdicts, swarms, fleets } : null;
  return { words, problems };
}

const WEEKLY_WORDS = parseWeeklyWords(record(contentRaw).weekly).words;

/** Every pair a week may get, in a fixed order. The two firsts together are Story mode, so not a week. */
function weeklyPairs(pool: WeeklyPool): readonly [string, string][] {
  const pairs: [string, string][] = [];
  pool.swarms.forEach((swarm, swarmIndex) => {
    pool.fleets.forEach((fleet, fleetIndex) => {
      if (swarmIndex > 0 || fleetIndex > 0) pairs.push([swarm, fleet]);
    });
  });
  return pairs;
}

/** FNV-1a, 32 bits: turns a week's key into a seed. Not a security measure. */
function seedOf(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** The key for the week `now` falls in (UTC), such as `weekly:2026-W40`. */
export function weeklyKeyFor(now: Date): string {
  return `${WEEKLY_KEY_PREFIX}${formatIsoWeek(isoWeekOf(now))}`;
}

/** The week a weekly key names, or null for anything else, including a week that does not exist. */
export function weekOfKey(key: string): { year: number; week: number } | null {
  return key.startsWith(WEEKLY_KEY_PREFIX) ? parseIsoWeek(key.slice(WEEKLY_KEY_PREFIX.length)) : null;
}

/**
 * The swarm and fleet variants a week gets: the same for everyone, from the week's key alone. A
 * change to the pool changes past weeks too; the game version on a shared result says so.
 */
export function weeklyPair(key: string, pool: WeeklyPool = WEEKLY_POOL): { swarm: string; fleet: string } | null {
  if (!weekOfKey(key)) return null;
  const pairs = weeklyPairs(pool);
  const pair = pairs[createRandomStream(seedOf(key)).index(pairs.length)];
  return pair ? { swarm: pair[0], fleet: pair[1] } : null;
}

function weeklyWordsFor(key: string): ChallengeWords | null {
  const week = weekOfKey(key);
  const pair = weeklyPair(key);
  if (!week || !pair || !WEEKLY_WORDS) return null;
  const parts = [WEEKLY_WORDS.swarms.get(pair.swarm), WEEKLY_WORDS.fleets.get(pair.fleet)];
  // The tier's own numbers go unmentioned, unless both are (which never happens).
  const changed = [pair.swarm !== WEEKLY_POOL.swarms[0] ? parts[0] : undefined, pair.fleet !== WEEKLY_POOL.fleets[0] ? parts[1] : undefined];
  return {
    key,
    name: WEEKLY_WORDS.name.replace('{week}', String(week.week)),
    blurb: WEEKLY_WORDS.blurb,
    details: changed.filter((part): part is VariantWords => part !== undefined).map((part) => `${part.name}: ${part.line}`),
    verdicts: WEEKLY_WORDS.verdicts,
  };
}

function wordsFor(key: string): ChallengeWords | null {
  return WORDS.get(key) ?? weeklyWordsFor(key);
}

// ---------- What the title and the end screen ask ----------

/** The set challenges the title offers, in the order `balance/challenges.json` lists them. */
export function listChallenges(): readonly ChallengeInfo[] {
  return [...WORDS.values()].map(({ key, name, blurb, details }) => ({ key, name, blurb, details }));
}

/** This week's challenge, or null if its words are missing (the content check names them). */
export function weeklyChallenge(now: Date): ChallengeInfo | null {
  const words = weeklyWordsFor(weeklyKeyFor(now));
  return words ? { key: words.key, name: words.name, blurb: words.blurb, details: words.details } : null;
}

/**
 * Null for a key this version cannot play: unknown, or missing its words. Any real week plays,
 * past or future, so a link keeps its week's rules after the week is over.
 */
export function challengeLaunch(key: string): ChallengeLaunch | null {
  if (!wordsFor(key)) return null;
  const preset = challengePreset(key);
  if (preset) {
    const rules = mutatorOptions(preset.mutators);
    return { key, tier: preset.tier, profile: preset.profile, rules, scoring: rules.resurrectionShip === false ? 'endless' : 'story' };
  }
  const pair = weeklyPair(key);
  const profile = pair ? WEEKLY_POOL.profiles[weeklyPairKey(pair.swarm, pair.fleet)] : undefined;
  return profile ? { key, tier: WEEKLY_POOL.tier, profile, rules: {}, scoring: 'story' } : null;
}

export function challengeName(key: string): string {
  return wordsFor(key)?.name ?? RETIRED_NAME;
}

/** What a weekly challenge changes, for the end screen. Empty for a set or retired challenge. */
export function challengeDetails(key: string): readonly string[] {
  return wordsFor(key)?.details ?? [];
}

function bandFor(bands: readonly VerdictBand[], score: number): VerdictBand | undefined {
  let chosen = bands[0];
  for (const band of bands) if (score >= band.atLeast) chosen = band;
  return chosen;
}

/** A verdict for a run that just ended, from the band its score reached. Empty if the challenge has none. */
export function pickVerdict(key: string, score: number, random: RandomStream): string {
  const band = bandFor(wordsFor(key)?.verdicts ?? [], score);
  if (!band) return '';
  return band.lines[random.index(band.lines.length)]?.id ?? '';
}

/**
 * The verdict a result names, filled in. A link can outlive its line (the content pass cuts it), so
 * an unknown id shows the first line of the band the score reached. Null for a retired challenge.
 */
export function verdictText(tag: ChallengeTag, score: number, cycles: number): string | null {
  const bands = wordsFor(tag.key)?.verdicts;
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
