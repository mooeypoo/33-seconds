import raw from './challenges.json';
import tiersRaw from './tiers.json';
import { isTierId, type CycleProfile, type TierId } from '../domain/balance/profile';
import type { GameOptions } from '../domain/game';
import { parseTierProfile, TierProfileError } from './profileSchema';

/**
 * Challenge numbers (PRD 11.1, ADR-0004): a base tier with some of its profile replaced. The result
 * is a whole profile checked by the same schema as `tiers.json`, so a challenge moves numbers that
 * already exist and spends no knob. It reaches the game as an ordinary `tierProfile`, plus the run
 * options its mutators name.
 */
export interface ChallengePreset {
  readonly id: string;
  readonly tier: TierId;
  readonly profile: CycleProfile;
  readonly mutators: readonly Mutator[];
}

/**
 * Rule variants a challenge may name (ADR-0004). Each is a finished rule chosen for a whole run.
 * `endless`: no resurrection ship; the run is scored by the jumps the fleet held (PRD 11.1).
 * `slow-ftl`: 66-second cycles, the one exception to the 33-second clock (PRD 5.1, 11.1).
 */
export const MUTATORS = ['endless', 'slow-ftl'] as const;

/** What mutators can set. Every challenge rule reaches the game through these fields. */
export type ChallengeRules = Pick<GameOptions, 'resurrectionShip' | 'cycleSeconds'>;
export type Mutator = (typeof MUTATORS)[number];

/** The run options a challenge's mutators set: the one place a mutator's name becomes a rule. */
export function mutatorOptions(mutators: readonly Mutator[]): ChallengeRules {
  return {
    ...(mutators.includes('endless') ? { resurrectionShip: false } : {}),
    ...(mutators.includes('slow-ftl') ? { cycleSeconds: 66 as const } : {}),
  };
}

function isMutator(value: unknown): value is Mutator {
  return typeof value === 'string' && (MUTATORS as readonly string[]).includes(value);
}

export class ChallengePresetError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid challenges:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

/** Also what a share link may carry, so keep it short and plain. */
export const CHALLENGE_ID_PATTERN = /^[a-z0-9-]{1,32}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseOne(
  id: string,
  value: unknown,
  tiers: Record<string, unknown>,
  problems: string[],
): ChallengePreset | null {
  const entry = record(value);
  if (!entry) {
    problems.push(`${id} must be an object`);
    return null;
  }
  for (const key of Object.keys(entry)) {
    if (key !== 'tier' && key !== 'profile' && key !== 'mutators') problems.push(`${id}.${key} is not a known setting`);
  }
  const rawMutators: unknown[] = entry.mutators === undefined ? [] : Array.isArray(entry.mutators) ? entry.mutators : [null];
  const mutators = rawMutators.filter(isMutator);
  if (mutators.length !== rawMutators.length || new Set(mutators).size !== mutators.length) {
    problems.push(`${id}.mutators must list known mutators (${MUTATORS.join(', ')}), each once`);
  }
  const tier = entry.tier;
  if (typeof tier !== 'string' || !isTierId(tier)) {
    problems.push(`${id}.tier must be a known tier id`);
    return null;
  }
  const patch = entry.profile === undefined ? {} : record(entry.profile);
  if (!patch) {
    problems.push(`${id}.profile must be an object of tier settings`);
    return null;
  }
  try {
    const merged = { ...record(tiers[tier]), ...patch };
    return { id, tier, profile: parseTierProfile(tier, merged), mutators };
  } catch (error) {
    if (!(error instanceof TierProfileError)) throw error;
    // The schema names the base tier; the writer is editing the challenge.
    problems.push(...error.problems.map((problem) => `${id}.profile: ${problem.replace(`${tier}.`, '')}`));
    return null;
  }
}

/** Names every problem at once. The file is bundled, so a bad value is a developer's mistake. */
export function parseChallenges(input: unknown, tiers: unknown = tiersRaw): Readonly<Record<string, ChallengePreset>> {
  const problems: string[] = [];
  const root = record(input) ?? {};
  const entries = record(root.challenges);
  if (!entries || Object.keys(entries).length === 0) problems.push('challenges must name at least one challenge');
  const parsed: Record<string, ChallengePreset> = {};
  for (const [id, value] of Object.entries(entries ?? {})) {
    if (!CHALLENGE_ID_PATTERN.test(id)) {
      problems.push(`challenge id ${id} must be up to 32 lowercase letters, digits, and dashes`);
      continue;
    }
    const preset = parseOne(id, value, record(tiers) ?? {}, problems);
    if (preset) parsed[id] = preset;
  }
  if (problems.length > 0) throw new ChallengePresetError(problems);
  return parsed;
}

export const CHALLENGE_PRESETS: Readonly<Record<string, ChallengePreset>> = parseChallenges(raw);

/**
 * The weekly challenge's pool (PRD 11.1): a base tier and two lists of variants. A week is one of
 * each, picked from its key by the application. The first variant of each list is the tier's own
 * numbers, and a week never pairs the two firsts, because that pair is Story mode.
 */
export interface WeeklyPool {
  readonly tier: TierId;
  /** Variant ids, in file order. */
  readonly swarms: readonly string[];
  readonly fleets: readonly string[];
  /** Every pair's whole profile, by `${swarm}+${fleet}`, checked when the file loads. */
  readonly profiles: Readonly<Record<string, CycleProfile>>;
}

/** What each list may touch, so a pair can never set the same field twice. */
const SWARM_VARIANT_FIELDS = new Set([
  'directorCap',
  'swarmFloor',
  'sineShare',
  'attackTokens',
  'strafeTokens',
  'downloadJitterSeconds',
  'heavyFromCycle',
  'heavyPerCycle',
  'heavyMax',
]);
const FLEET_VARIANT_FIELDS = new Set(['fleetCycleDamageCap', 'fleetRepairOfMissing']);

export const VARIANT_ID_PATTERN = /^[a-z0-9-]{1,20}$/;

function parseVariants(
  where: string,
  value: unknown,
  allowed: ReadonlySet<string>,
  problems: string[],
): [string, Record<string, unknown>][] {
  const list = record(value);
  if (!list || Object.keys(list).length < 2) {
    problems.push(`weekly.${where} needs the tier's own numbers first and at least one variant`);
    return [];
  }
  const variants: [string, Record<string, unknown>][] = [];
  for (const [id, entry] of Object.entries(list)) {
    const patch = record(entry);
    if (!VARIANT_ID_PATTERN.test(id)) problems.push(`weekly.${where}: id ${id} must be up to 20 lowercase letters, digits, and dashes`);
    else if (!patch) problems.push(`weekly.${where}.${id} must be an object of tier settings`);
    else {
      for (const key of Object.keys(patch)) {
        if (!allowed.has(key)) problems.push(`weekly.${where}.${id}.${key} is not a ${where === 'swarms' ? 'swarm' : 'fleet'} setting`);
      }
      variants.push([id, patch]);
    }
  }
  const first = variants[0];
  if (first && Object.keys(first[1]).length > 0) problems.push(`weekly.${where}.${first[0]} comes first, so it must be {} (the tier's own numbers)`);
  return variants;
}

export function weeklyPairKey(swarm: string, fleet: string): string {
  return `${swarm}+${fleet}`;
}

/** Names every problem at once, including any pair whose merged numbers are out of bounds. */
export function parseWeeklyPool(input: unknown, tiers: unknown = tiersRaw): WeeklyPool {
  const problems: string[] = [];
  const weekly = record(record(input)?.weekly) ?? {};
  for (const key of Object.keys(weekly)) {
    if (!['_readme', 'tier', 'swarms', 'fleets'].includes(key)) problems.push(`weekly.${key} is not a known setting`);
  }
  const tier = weekly.tier;
  if (typeof tier !== 'string' || !isTierId(tier)) problems.push('weekly.tier must be a known tier id');
  const swarms = parseVariants('swarms', weekly.swarms, SWARM_VARIANT_FIELDS, problems);
  const fleets = parseVariants('fleets', weekly.fleets, FLEET_VARIANT_FIELDS, problems);
  const profiles: Record<string, CycleProfile> = {};
  if (problems.length === 0 && typeof tier === 'string' && isTierId(tier)) {
    const base = record(record(tiers)?.[tier]) ?? {};
    for (const [swarmId, swarm] of swarms) {
      for (const [fleetId, fleet] of fleets) {
        const pair = weeklyPairKey(swarmId, fleetId);
        try {
          profiles[pair] = parseTierProfile(tier, { ...base, ...swarm, ...fleet });
        } catch (error) {
          if (!(error instanceof TierProfileError)) throw error;
          problems.push(...error.problems.map((problem) => `weekly ${pair}: ${problem.replace(`${tier}.`, '')}`));
        }
      }
    }
  }
  if (problems.length > 0) throw new ChallengePresetError(problems);
  return {
    tier: tier as TierId,
    swarms: swarms.map(([id]) => id),
    fleets: fleets.map(([id]) => id),
    profiles,
  };
}

export const WEEKLY_POOL: WeeklyPool = parseWeeklyPool(raw);

export function challengePreset(id: string): ChallengePreset | null {
  return Object.hasOwn(CHALLENGE_PRESETS, id) ? (CHALLENGE_PRESETS[id] ?? null) : null;
}
