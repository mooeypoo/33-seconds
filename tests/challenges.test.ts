import { describe, expect, it } from 'vitest';
import { GameSession } from '../src/application/GameSession';
import {
  compareWithRival,
  parseChallengeWords,
  pickVerdict,
  verdictText,
  type ChallengeTag,
} from '../src/application/challenges';
import { ChallengePresetError, parseChallenges } from '../src/balance/challenges';
import TIERS from '../src/balance/tiers.json';
import type { InputPort } from '../src/application/ports/InputPort';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { createRandomStream } from '../src/domain/shared/random';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

const IDLE_INPUT: InputPort = { readIntent: () => IDLE_INTENT, clear: () => undefined };

function problemsOf(input: unknown): readonly string[] {
  try {
    parseChallenges(input);
    return [];
  } catch (error) {
    if (error instanceof ChallengePresetError) return error.problems;
    throw error;
  }
}

describe('a challenge preset', () => {
  it('is its base tier with only the named fields replaced', () => {
    const presets = parseChallenges({
      challenges: { harder: { tier: 'viper-pilot', profile: { fleetRepairOfMissing: 0.1, directorCap: [9] } } },
    });
    const harder = presets.harder;
    expect(harder?.tier).toBe('viper-pilot');
    expect(harder?.profile).toEqual({ ...TIERS['viper-pilot'], id: 'viper-pilot', fleetRepairOfMissing: [0.1], directorCap: [9] });
    expect(harder?.mutators).toEqual([]);
  });

  it('names every bad entry at once, by challenge', () => {
    const problems = problemsOf({
      challenges: {
        typo: { tier: 'viper-pilot', profile: { fleetRepair: 0.1 } },
        wild: { tier: 'viper-pilot', profile: { fleetRepairOfMissing: 3 } },
        nobody: { tier: 'admiral' },
        'Bad Id': { tier: 'viper-pilot' },
        extra: { tier: 'viper-pilot', rules: ['endless'] },
        twice: { tier: 'viper-pilot', mutators: ['endless', 'endless'] },
        unknown: { tier: 'viper-pilot', mutators: ['zero-g'] },
      },
    });
    expect(problems).toEqual([
      expect.stringContaining('typo.profile: fleetRepair is not a known setting'),
      expect.stringContaining('wild.profile: fleetRepairOfMissing must be a number from 0 to 1'),
      expect.stringContaining('nobody.tier'),
      expect.stringContaining('challenge id Bad Id'),
      expect.stringContaining('extra.rules is not a known setting'),
      expect.stringContaining('twice.mutators must list known mutators'),
      expect.stringContaining('unknown.mutators must list known mutators'),
    ]);
    expect(problemsOf({ challenges: {} })).toEqual(['challenges must name at least one challenge']);
  });
});

describe('verdicts', () => {
  const words = parseChallengeWords('sample', {
    name: 'Sample',
    blurb: 'A test challenge.',
    verdicts: [
      { atLeast: 0, lines: [{ id: 'low', text: 'Low, {score}.' }] },
      { atLeast: 800, lines: [{ id: 'mid-a', text: 'Mid A.' }, { id: 'mid-b', text: 'Mid B.' }] },
    ],
  });

  it('parse without problems when well formed', () => {
    expect(words.problems).toEqual([]);
    expect(words.words?.verdicts.map((band) => band.atLeast)).toEqual([0, 800]);
  });

  it('name bands that do not start at 0 or do not climb, repeated ids, and empty bands', () => {
    const { problems, words: kept } = parseChallengeWords('bad', {
      name: 'Bad',
      blurb: 'Bad bands.',
      verdicts: [
        { atLeast: 100, lines: [{ id: 'a', text: 'A.' }] },
        { atLeast: 0, lines: [{ id: 'b', text: 'B.' }] },
        { atLeast: 0, lines: [{ id: 'b', text: 'B again.' }] },
        { atLeast: 500, lines: [] },
      ],
    });
    expect(problems).toEqual([
      expect.stringContaining('verdicts[0].atLeast must be 0 for the first band'),
      expect.stringContaining('verdicts[2].atLeast must be higher than the band before'),
      expect.stringContaining('verdicts[3] needs at least one line'),
    ]);
    // What survives is still usable: the one good band.
    expect(kept?.verdicts).toEqual([{ atLeast: 0, lines: [{ id: 'b', text: 'B.' }] }]);
  });

  it('come from the band the score reached, including exactly at its edge', () => {
    // The real content: swarm's bands start at 0, 800, and 1600.
    const draws = (score: number): Set<string> => {
      const random = createRandomStream(3);
      return new Set(Array.from({ length: 40 }, () => pickVerdict('swarm', score, random)));
    };
    expect([...draws(0)].every((id) => id.startsWith('s-low'))).toBe(true);
    expect([...draws(799)].every((id) => id.startsWith('s-low'))).toBe(true);
    expect([...draws(800)].every((id) => id.startsWith('s-mid'))).toBe(true);
    expect(draws(800).size).toBe(2);
    expect([...draws(9_999_999)].every((id) => id.startsWith('s-high'))).toBe(true);
  });

  it('fall back to the first line of the score band when a link names a line that was cut', () => {
    const cut: ChallengeTag = { key: 'swarm', verdictId: 'cut-line' };
    const kept: ChallengeTag = { key: 'swarm', verdictId: 's-low-2' };
    const firstMid = verdictText({ key: 'swarm', verdictId: 's-mid-1' }, 900, 5);
    expect(verdictText(cut, 900, 5)).toBe(firstMid);
    // A known line shows as written, whatever the score says now.
    expect(verdictText(kept, 900, 5)).toBe(verdictText(kept, 0, 5));
    expect(verdictText({ key: 'gone-now', verdictId: 'x' }, 900, 5)).toBeNull();
  });
});

describe('Beat this', () => {
  const swarm = (score: number): { score: number; challenge: ChallengeTag } => ({
    score,
    challenge: { key: 'swarm', verdictId: 's-low-1' },
  });

  it('compares only runs of the same challenge', () => {
    expect(compareWithRival(swarm(900), swarm(800))).toEqual({ outcome: 'beat', yours: 900, theirs: 800 });
    expect(compareWithRival(swarm(800), swarm(800))?.outcome).toBe('tied');
    expect(compareWithRival(swarm(799), swarm(800))?.outcome).toBe('short');
    const tyrol = { score: 100, challenge: { key: 'tyrol-overwhelmed', verdictId: 't-low-1' } };
    expect(compareWithRival(tyrol, swarm(800))).toBeNull();
    expect(compareWithRival({ score: 100, challenge: null }, swarm(800))).toBeNull();
    expect(compareWithRival(swarm(800), { score: 100, challenge: null })).toBeNull();
  });
});

describe('a challenge run', () => {
  /** The Viper holds its gun and nobody shoots, so the swarm fills to its cap and strafes end the run. */
  function quietSession(): GameSession {
    return new GameSession(IDLE_INPUT, { seed: 1, raidersFire: false, viperFires: false, fleetStartingIntegrity: 8 });
  }

  function mostRaidersInFirstSeconds(session: GameSession, seconds: number): number {
    let most = 0;
    for (let i = 0; i < TICKS_PER_SECOND * seconds && session.status.phase === 'running'; i++) {
      session.advance(TICK_SECONDS);
      most = Math.max(most, session.view.raiders.length);
    }
    return most;
  }

  function playUntilOver(session: GameSession): void {
    for (let i = 0; i < TICKS_PER_SECOND * 60 && session.status.phase === 'running'; i++) session.advance(TICK_SECONDS);
  }

  it("flies the challenge's numbers, not the tier's", () => {
    const story = quietSession();
    story.start('viper-pilot');
    const challenge = quietSession();
    challenge.startChallenge('swarm');
    // Viper Pilot caps cycle 1 at 3 Raiders; Swarm at 4.
    expect(mostRaidersInFirstSeconds(story, 20)).toBe(3);
    expect(mostRaidersInFirstSeconds(challenge, 20)).toBe(4);
  });

  it('ends with the challenge and a verdict from its band, and the next Story run carries neither', () => {
    const session = quietSession();
    session.startChallenge('swarm');
    playUntilOver(session);
    const result = session.status.result;
    expect(result?.outcome).toBe('lost');
    expect(result?.challenge?.key).toBe('swarm');
    expect(result?.score).toBeLessThan(800);
    expect(result?.challenge?.verdictId).toMatch(/^s-low-/);

    session.returnToTitle();
    session.start();
    playUntilOver(session);
    expect(session.status.result?.challenge).toBeNull();
  });

  it('Endless flies without the ship and ends as held, scored by its own rules', () => {
    const session = new GameSession(IDLE_INPUT, { seed: 2, raidersFire: false, viperFires: false, fleetStartingIntegrity: 60 });
    session.startChallenge('endless');
    // Through every jump, taking no card, until the fleet falls.
    for (let i = 0; i < TICKS_PER_SECOND * 60 * 20 && session.status.phase !== 'lost'; i++) {
      if (session.status.choosingUpgrade) session.continueFromJump();
      session.advance(TICK_SECONDS);
    }
    const result = session.status.result;
    expect(result?.outcome).toBe('held');
    expect(result?.headlineId).toMatch(/^held-/);
    expect(result?.resurrectionShipPercent).toBe(0);
    // A gun held quiet kills nothing, so the score is the jumps alone: 100 a jump, as shipped.
    expect(result?.raiderKills).toBe(0);
    expect(result?.score).toBe((Math.max(1, result?.cycle ?? 1) - 1) * 100 - (result?.ejects ?? 0) * 20);
    expect(result?.cycle).toBeGreaterThan(1);
  });

  it('Slow FTL flies 66-second cycles, and Story mode after it is back to 33', () => {
    const session = quietSession();
    session.startChallenge('slow-ftl');
    session.advance(TICK_SECONDS);
    expect(session.view.cycle).toMatchObject({ combatSeconds: 66, secondsRemaining: 66 });
    playUntilOver(session);
    session.returnToTitle();
    session.start();
    session.advance(TICK_SECONDS);
    expect(session.view.cycle).toMatchObject({ combatSeconds: 33, secondsRemaining: 33 });
  });

  it('does not leave the title for a challenge this version does not have', () => {
    const session = quietSession();
    session.startChallenge('gone-now');
    expect(session.status.phase).toBe('title');
  });
});
