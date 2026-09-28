import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/application/GameSession';
import {
  challengeLaunch,
  challengeName,
  parseWeeklyWords,
  weeklyChallenge,
  weeklyKeyFor,
  weeklyPair,
} from '../src/application/challenges';
import { isoWeekOf, isoWeeksIn, parseIsoWeek } from '../src/application/isoWeek';
import { ChallengePresetError, parseWeeklyPool, WEEKLY_POOL, weeklyPairKey } from '../src/balance/challenges';
import type { InputPort } from '../src/application/ports/InputPort';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

const utc = (year: number, month: number, day: number, hour = 0, minute = 0): Date =>
  new Date(Date.UTC(year, month - 1, day, hour, minute));

describe('ISO weeks', () => {
  it('turn over at Monday 00:00 UTC', () => {
    expect(isoWeekOf(utc(2026, 10, 4, 23, 59))).toEqual({ year: 2026, week: 40 });
    expect(isoWeekOf(utc(2026, 10, 5, 0, 0))).toEqual({ year: 2026, week: 41 });
  });

  it('put the first days of January in the last year when the week began there, and the reverse', () => {
    // 2026 starts on a Thursday, so it has 53 weeks, and 1 January 2027 (a Friday) is still in them.
    expect(isoWeekOf(utc(2026, 1, 1))).toEqual({ year: 2026, week: 1 });
    expect(isoWeekOf(utc(2027, 1, 1))).toEqual({ year: 2026, week: 53 });
    expect(isoWeekOf(utc(2027, 1, 4))).toEqual({ year: 2027, week: 1 });
    // 30 December 2024 is a Monday, and the week it starts holds 2 January 2025, a Thursday.
    expect(isoWeekOf(utc(2024, 12, 30))).toEqual({ year: 2025, week: 1 });
  });

  it('know which years are long', () => {
    expect(isoWeeksIn(2025)).toBe(52);
    expect(isoWeeksIn(2026)).toBe(53);
    expect(parseIsoWeek('2026-W53')).toEqual({ year: 2026, week: 53 });
    expect(parseIsoWeek('2025-W53')).toBeNull();
    expect(parseIsoWeek('2025-W00')).toBeNull();
    expect(parseIsoWeek('2025-W7')).toBeNull();
  });

  it('agree with the key a date gets, every day for three years', () => {
    for (let day = 0; day < 3 * 366; day++) {
      const date = new Date(utc(2025, 1, 1).getTime() + day * 86_400_000);
      const key = weeklyKeyFor(date);
      const week = isoWeekOf(date);
      expect(parseIsoWeek(key.slice('weekly:'.length))).toEqual(week);
      // Every day's week is a real, playable challenge.
      expect(challengeLaunch(key), key).not.toBeNull();
    }
  });
});

describe('the weekly pick', () => {
  const weeks = Array.from({ length: 260 }, (_, index) => weeklyKeyFor(new Date(utc(2026, 1, 5).getTime() + index * 7 * 86_400_000)));

  it('is the same for everyone who asks about a week', () => {
    expect(weeklyPair('weekly:2026-W40')).toEqual(weeklyPair('weekly:2026-W40'));
    expect(weeklyKeyFor(utc(2026, 9, 28, 1))).toBe(weeklyKeyFor(utc(2026, 10, 4, 23)));
  });

  it('never gives a week the tier’s own numbers on both sides, and reaches every other pair', () => {
    const story = weeklyPairKey(WEEKLY_POOL.swarms[0] ?? '', WEEKLY_POOL.fleets[0] ?? '');
    const seen = new Set<string>();
    for (const key of weeks) {
      const pair = weeklyPair(key);
      expect(pair, key).not.toBeNull();
      if (pair) seen.add(weeklyPairKey(pair.swarm, pair.fleet));
    }
    expect(seen.has(story)).toBe(false);
    expect(seen.size).toBe(WEEKLY_POOL.swarms.length * WEEKLY_POOL.fleets.length - 1);
  });

  it("plays its pair's numbers, whatever week it names", () => {
    for (const key of ['weekly:2026-W40', 'weekly:2031-W02']) {
      const pair = weeklyPair(key);
      const launch = challengeLaunch(key);
      expect(launch?.tier).toBe(WEEKLY_POOL.tier);
      expect(launch?.profile).toBe(WEEKLY_POOL.profiles[weeklyPairKey(pair?.swarm ?? '', pair?.fleet ?? '')]);
    }
  });

  it('refuses a week that does not exist', () => {
    for (const key of ['weekly:2025-W53', 'weekly:2026-W54', 'weekly:', 'weekly:2026-40', 'weekly2026-W40']) {
      expect(weeklyPair(key), key).toBeNull();
      expect(challengeLaunch(key), key).toBeNull();
      expect(challengeName(key)).toBe('A retired challenge');
    }
  });

  it('is named by its week and says what it changes', () => {
    const info = weeklyChallenge(utc(2026, 9, 30));
    expect(info?.key).toBe('weekly:2026-W40');
    expect(info?.name).toBe('Week 40');
    expect(info?.details.length).toBeGreaterThanOrEqual(1);
    expect(info?.details.length).toBeLessThanOrEqual(2);
  });
});

describe('the weekly pool', () => {
  function problemsOf(weekly: unknown): readonly string[] {
    try {
      parseWeeklyPool({ weekly });
      return [];
    } catch (error) {
      if (error instanceof ChallengePresetError) return error.problems;
      throw error;
    }
  }

  it('keeps each list to its own fields, starts with the tier’s own numbers, and checks every pair', () => {
    expect(
      problemsOf({
        tier: 'viper-pilot',
        swarms: { steady: { directorCap: [4] }, crowd: { fleetRepairOfMissing: 0.2 } },
        fleets: { standard: {}, doomed: { fleetCycleDamageCap: 150 } },
      }),
    ).toEqual([
      'weekly.swarms.crowd.fleetRepairOfMissing is not a swarm setting',
      "weekly.swarms.steady comes first, so it must be {} (the tier's own numbers)",
    ]);
    expect(
      problemsOf({ tier: 'viper-pilot', swarms: { steady: {}, big: { directorCap: [40] } }, fleets: { standard: {}, doomed: {} } }),
    ).toEqual([
      expect.stringContaining('weekly big+standard: directorCap[0]'),
      expect.stringContaining('weekly big+doomed: directorCap[0]'),
    ]);
    expect(problemsOf({ tier: 'viper-pilot', swarms: { steady: {} }, fleets: { standard: {}, x: {} } })).toEqual([
      "weekly.swarms needs the tier's own numbers first and at least one variant",
    ]);
  });

  it('needs words for every variant it can pick, and none for a variant it cannot', () => {
    const { problems, words } = parseWeeklyWords({
      name: 'Week {week}',
      blurb: 'A test week.',
      verdicts: [{ atLeast: 0, lines: [{ id: 'w', text: 'W.' }] }],
      swarms: Object.fromEntries(WEEKLY_POOL.swarms.map((id) => [id, { name: id, line: 'A line.' }])),
      fleets: { ...Object.fromEntries(WEEKLY_POOL.fleets.slice(1).map((id) => [id, { name: id, line: 'A line.' }])), gone: { name: 'Gone', line: 'Cut.' } },
    });
    expect(problems).toEqual([
      expect.stringContaining(`weekly.fleets.${WEEKLY_POOL.fleets[0] ?? ''} needs a name`),
      'weekly.fleets.gone has no numbers in balance/challenges.json',
    ]);
    // A weekly challenge with a variant it cannot name is not offered at all.
    expect(words).toBeNull();
  });
});

describe('a weekly run', () => {
  const input: InputPort = { readIntent: () => IDLE_INTENT, clear: () => undefined };

  it('ends tagged with its week and a weekly verdict', () => {
    const session = new GameSession(input, { seed: 1, raidersFire: false, viperFires: false, fleetStartingIntegrity: 8 });
    session.startChallenge('weekly:2026-W40');
    expect(session.status.challenge).toBe('weekly:2026-W40');
    for (let i = 0; i < TICKS_PER_SECOND * 60 && session.status.phase === 'running'; i++) session.advance(TICK_SECONDS);
    expect(session.status.result?.challenge?.key).toBe('weekly:2026-W40');
    expect(session.status.result?.challenge?.verdictId).toMatch(/^w-low-/);
  });
});
