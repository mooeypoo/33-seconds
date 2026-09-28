import { describe, expect, it } from 'vitest';
import fingerprintRaw from '../../src/balance/fingerprint.json';
import scoringRaw from '../../src/balance/scoring.json';
import tiersRaw from '../../src/balance/tiers.json';
import challengesRaw from '../../src/balance/challenges.json';

/**
 * Part of `npm run check:content`, in its own file so the guardrail sabotages that corrupt the
 * balance files can run the validation checks without tripping this one first.
 */

/** JSON with its keys sorted, so reformatting a file does not count as a change. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a, 32 bits, as hex. A change detector, not a security measure. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

describe('balance fingerprint', () => {
  /**
   * The reminder to bump the game version (PRD 5.4, 17). Shared results show the version, which
   * only means something if it moves when scores do. `fingerprint.json` records the tier, score, and challenge
   * numbers as of a version; changing either file fails here until the fingerprint is updated. The
   * failure prints what to paste. Rule changes in code are not covered: bump for those by hand.
   */
  it('matches the tier, score, and challenge numbers, as of the current game version', () => {
    const current = { version: __GAME_VERSION__, balance: fnv1a(canonical({ challenges: challengesRaw.challenges, scoring: scoringRaw, tiers: tiersRaw })) };
    const recorded = fingerprintRaw as { version: unknown; balance: unknown };
    const paste = `"version": "${current.version}", "balance": "${current.balance}"`;
    if (recorded.balance !== current.balance && recorded.version === current.version) {
      expect.fail(
        `tiers.json, scoring.json, or challenges.json changed, but the game version is still ${current.version}.\n` +
          'If this changes how scores read, bump "version" in package.json first (then rerun this).\n' +
          `Either way, set these in src/balance/fingerprint.json:\n${paste}`,
      );
    }
    if (recorded.balance !== current.balance || recorded.version !== current.version) {
      expect.fail(`src/balance/fingerprint.json is out of date. Set these in it:\n${paste}`);
    }
  });
});
