import raw from './challenges.json';
import tiersRaw from './tiers.json';
import { isTierId, type CycleProfile, type TierId } from '../domain/balance/profile';
import { parseTierProfile, TierProfileError } from './profileSchema';

/**
 * Challenge numbers (PRD 11.1, ADR-0004): a base tier with some of its profile replaced. The result
 * is a whole profile checked by the same schema as `tiers.json`, so a challenge moves numbers that
 * already exist and spends no knob. It reaches the game as an ordinary `tierProfile`.
 */
export interface ChallengePreset {
  readonly id: string;
  readonly tier: TierId;
  readonly profile: CycleProfile;
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
    if (key !== 'tier' && key !== 'profile') problems.push(`${id}.${key} is not a known setting`);
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
    return { id, tier, profile: parseTierProfile(tier, merged) };
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

export function challengePreset(id: string): ChallengePreset | null {
  return Object.hasOwn(CHALLENGE_PRESETS, id) ? (CHALLENGE_PRESETS[id] ?? null) : null;
}
