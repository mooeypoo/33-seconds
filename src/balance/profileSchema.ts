import type { CycleProfile, Ramp, TierId } from '../domain/balance/profile';

/**
 * Checks a tier profile read from JSON (ADR-0002 Phase 3). The file is bundled, so a bad number is
 * a developer's mistake: this names every problem at once, and `check:content` runs it in CI.
 */
export class TierProfileError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid tier profile:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  }
}

/** Upper bound on any count in a ramp. Well past what a 270-wide lane can read (PRD 9). */
const MAX_COUNT = 30;

interface Field {
  readonly problems: string[];
  readonly record: Record<string, unknown>;
  readonly where: string;
}

function number(field: Field, key: string, min: number, max: number): number {
  const value = field.record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    field.problems.push(`${field.where}.${key} must be a number from ${String(min)} to ${String(max)}`);
    return min;
  }
  return value;
}

function ramp(field: Field, key: string, min: number): Ramp {
  const value = field.record[key];
  if (!Array.isArray(value) || value.length === 0) {
    field.problems.push(`${field.where}.${key} must be a non-empty list, one value per cycle`);
    return [min];
  }
  value.forEach((entry, index) => {
    if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < min || entry > MAX_COUNT) {
      field.problems.push(
        `${field.where}.${key}[${String(index)}] (cycle ${String(index + 1)}) must be a whole number from ${String(min)} to ${String(MAX_COUNT)}`,
      );
    }
  });
  return value as number[];
}

export function parseTierProfile(id: TierId, raw: unknown): CycleProfile {
  const problems: string[] = [];
  const record = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  if (record !== raw) problems.push(`${id} must be an object`);
  const field: Field = { problems, record, where: id };

  const profile: CycleProfile = {
    id,
    fleetCycleDamageCap: number(field, 'fleetCycleDamageCap', 1, 100),
    fleetRepairOfMissing: number(field, 'fleetRepairOfMissing', 0, 1),
    directorCap: ramp(field, 'directorCap', 1),
    attackTokens: ramp(field, 'attackTokens', 0),
    strafeTokens: ramp(field, 'strafeTokens', 0),
  };

  const known = new Set(Object.keys(profile));
  for (const key of Object.keys(record)) {
    if (!known.has(key)) problems.push(`${id}.${key} is not a known setting`);
  }
  if (problems.length > 0) throw new TierProfileError(problems);
  return profile;
}
