import raw from './training.json';
import { isTierId, type SwarmOverride, type TierId } from '../domain/balance/profile';

/**
 * The Training Run's numbers (PRD 5.5): which tier's fleet math it borrows, a resurrection ship that
 * arrives, drops its shield, and dies sooner than in a real run, and the drills. A drill is a swarm
 * override (what the sim throws at you) that a lesson starts when it is read, so the sim can go from
 * one harmless drone to live fire inside a single 33-second cycle. It all reaches the game as
 * ordinary `GameOptions` and `setSwarmOverride`: training adds no rule.
 */
export interface TrainingPreset {
  readonly tier: TierId;
  readonly resurrectionShipArrivesCycle: number;
  readonly resurrectionShipVulnerableCycle: number;
  readonly resurrectionShipHitPoints: number;
  /** The drill the run starts in, before any lesson has been read. */
  readonly firstDrill: string;
  /** Drill id to its swarm. An empty swarm is the tier's own ramps. */
  readonly drills: Readonly<Record<string, SwarmOverride>>;
}

export class TrainingPresetError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid training preset:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

export const DRILL_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Bounds for a drill's swarm. Wide enough to stage anything, narrow enough to catch a typo. */
const SWARM_FIELDS: Readonly<Record<keyof SwarmOverride, { min: number; max: number; whole: boolean }>> = {
  cap: { min: 1, max: 12, whole: true },
  floor: { min: 0, max: 12, whole: true },
  sineShare: { min: 0, max: 1, whole: false },
  attackTokens: { min: 0, max: 6, whole: true },
  strafeTokens: { min: 0, max: 6, whole: true },
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function wholeNumber(record: Record<string, unknown>, key: string, min: number, max: number, problems: string[]): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    problems.push(`${key} must be a whole number from ${String(min)} to ${String(max)}`);
    return min;
  }
  return value;
}

function parseSwarm(id: string, value: unknown, problems: string[]): SwarmOverride {
  const swarm = record(value);
  if (!swarm) {
    problems.push(`drills.${id} must be an object of swarm numbers`);
    return {};
  }
  const parsed: Partial<Record<keyof SwarmOverride, number>> = {};
  for (const [key, entry] of Object.entries(swarm)) {
    const bounds = (SWARM_FIELDS as Record<string, (typeof SWARM_FIELDS)['cap'] | undefined>)[key];
    if (!bounds) {
      problems.push(`drills.${id}.${key} is not a swarm setting`);
      continue;
    }
    const ok = typeof entry === 'number' && Number.isFinite(entry) && entry >= bounds.min && entry <= bounds.max;
    if (!ok || (bounds.whole && !Number.isInteger(entry))) {
      const kind = bounds.whole ? 'a whole number' : 'a number';
      problems.push(`drills.${id}.${key} must be ${kind} from ${String(bounds.min)} to ${String(bounds.max)}`);
      continue;
    }
    parsed[key as keyof SwarmOverride] = entry;
  }
  return parsed;
}

function parseDrills(value: unknown, problems: string[]): Record<string, SwarmOverride> {
  const drills = record(value);
  if (!drills || Object.keys(drills).length === 0) {
    problems.push('drills must name at least one drill');
    return {};
  }
  const parsed: Record<string, SwarmOverride> = {};
  for (const [id, swarm] of Object.entries(drills)) {
    if (!DRILL_ID_PATTERN.test(id)) problems.push(`drill id ${id} must be lowercase letters, digits, and dashes`);
    parsed[id] = parseSwarm(id, swarm, problems);
  }
  return parsed;
}

/** Names every problem at once. The file is bundled, so a bad value is a developer's mistake. */
export function parseTrainingPreset(input: unknown): TrainingPreset {
  const problems: string[] = [];
  const record = input !== null && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  if (record !== input) problems.push('the preset must be an object');
  const tier = record.tier;
  if (typeof tier !== 'string' || !isTierId(tier)) problems.push(`tier must be a known tier id`);
  const arrives = wholeNumber(record, 'resurrectionShipArrivesCycle', 1, 10, problems);
  const vulnerable = wholeNumber(record, 'resurrectionShipVulnerableCycle', 1, 10, problems);
  if (vulnerable < arrives) problems.push('resurrectionShipVulnerableCycle must not come before it arrives');
  const hitPoints = wholeNumber(record, 'resurrectionShipHitPoints', 1, 200, problems);
  const drills = parseDrills(record.drills, problems);
  const firstDrill = record.firstDrill;
  if (typeof firstDrill !== 'string' || !(firstDrill in drills)) problems.push('firstDrill must name one of the drills');
  const known = new Set([
    'tier',
    'resurrectionShipArrivesCycle',
    'resurrectionShipVulnerableCycle',
    'resurrectionShipHitPoints',
    'firstDrill',
    'drills',
  ]);
  for (const key of Object.keys(record)) {
    if (!known.has(key)) problems.push(`${key} is not a known setting`);
  }
  if (problems.length > 0) throw new TrainingPresetError(problems);
  return {
    tier: tier as TierId,
    resurrectionShipArrivesCycle: arrives,
    resurrectionShipVulnerableCycle: vulnerable,
    resurrectionShipHitPoints: hitPoints,
    firstDrill: firstDrill as string,
    drills,
  };
}

export const TRAINING_PRESET: TrainingPreset = parseTrainingPreset(raw);
