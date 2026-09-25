import raw from './training.json';
import { isTierId, type TierId } from '../domain/balance/profile';

/**
 * The Training Run's numbers (PRD 5.5): which tier's fleet math it borrows, and a resurrection
 * ship that arrives, drops its shield, and dies sooner than in a real run, so the whole arc fits in
 * about three cycles. They reach the game as ordinary `GameOptions`: training adds no rule.
 */
export interface TrainingPreset {
  readonly tier: TierId;
  readonly resurrectionShipArrivesCycle: number;
  readonly resurrectionShipVulnerableCycle: number;
  readonly resurrectionShipHitPoints: number;
}

export class TrainingPresetError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid training preset:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

function wholeNumber(record: Record<string, unknown>, key: string, min: number, max: number, problems: string[]): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    problems.push(`${key} must be a whole number from ${String(min)} to ${String(max)}`);
    return min;
  }
  return value;
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
  const known = new Set(['tier', 'resurrectionShipArrivesCycle', 'resurrectionShipVulnerableCycle', 'resurrectionShipHitPoints']);
  for (const key of Object.keys(record)) {
    if (!known.has(key)) problems.push(`${key} is not a known setting`);
  }
  if (problems.length > 0) throw new TrainingPresetError(problems);
  return {
    tier: tier as TierId,
    resurrectionShipArrivesCycle: arrives,
    resurrectionShipVulnerableCycle: vulnerable,
    resurrectionShipHitPoints: hitPoints,
  };
}

export const TRAINING_PRESET: TrainingPreset = parseTrainingPreset(raw);
