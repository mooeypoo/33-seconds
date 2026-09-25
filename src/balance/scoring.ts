import scoring from './scoring.json';
import type { ScoreWeights } from '../domain/scoring/score';

/**
 * The only place score numbers live (PRD 5.4): `scoring.json`, checked on load and by
 * `check:content`. Retuning is an edit to that file; `npm run sim` prints what the numbers give.
 * A change that moves scores should come with a new game version in `package.json`, because
 * shared links show it (PRD 17).
 */
const WEIGHT_KEYS = [
  'raiderKill',
  'heavyKill',
  'resurrectionShipDamage',
  'resurrectionShipDestroyed',
  'eject',
  'fleetDamagePercent',
  'winBonus',
  'fleetLeftPercent',
] as const satisfies readonly (keyof ScoreWeights)[];

/** Well past any sensible weight; a typo like 50000 should fail loudly. */
const MAX_WEIGHT = 10_000;

export function parseScoreWeights(raw: unknown): ScoreWeights {
  const record = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const problems: string[] = [];
  const weights: Record<string, number> = {};
  for (const key of WEIGHT_KEYS) {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_WEIGHT) {
      problems.push(`scoring.json: ${key} must be a number from 0 to ${String(MAX_WEIGHT)} (penalties are positive)`);
    } else weights[key] = value;
  }
  for (const key of Object.keys(record)) {
    if (!(WEIGHT_KEYS as readonly string[]).includes(key)) problems.push(`scoring.json: unknown key "${key}"`);
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));
  return weights as unknown as ScoreWeights;
}

export const SCORE_WEIGHTS: ScoreWeights = parseScoreWeights(scoring);
