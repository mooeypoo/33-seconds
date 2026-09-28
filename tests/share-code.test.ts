import { describe, expect, it } from 'vitest';
import { endingFor, endingLines, fillEnding, mostKilledLine } from '../src/application/endings';
import type { RunResult } from '../src/application/runResult';
import { sealLink } from '../src/application/linkSeal';
import { decodeSharedRun, encodeSharedRun, sharePayload, type SharedRun } from '../src/application/shareCode';
import { cardDefinition, maxStacksFor, STARTER_CARDS } from '../src/domain/progression/catalog';
import { createRandomStream } from '../src/domain/shared/random';

const LOSS: RunResult = {
  outcome: 'lost',
  tier: 'viper-pilot',
  score: 466,
  cycle: 6,
  raiderKills: 81,
  heavyKills: 3,
  ejects: 7,
  fleetLeftPercent: 0,
  resurrectionShipPercent: 42,
  mostKilled: { identityId: 7, kills: 14, reaction: 0 },
  cards: [
    { id: 'spoilers', stacks: 2 },
    { id: 'accidentally-wide', stacks: 1 },
  ],
  headlineId: 'lost-02',
  challenge: null,
};

const SHARED: SharedRun = { result: LOSS, gameVersion: '0.1.0' };

function link(run: SharedRun = SHARED): string {
  return `#${encodeSharedRun(run)}`;
}

/**
 * A correctly sealed link with one field's value replaced, or removed with `null`: what someone who
 * read the source could forge. The payload checks must hold even then.
 */
function withField(key: string, value: string | null): string {
  const pairs = sharePayload(SHARED)
    .split('&')
    .map((pair) => (pair.startsWith(`${key}=`) ? (value === null ? null : `${key}=${value}`) : pair))
    .filter((pair): pair is string => pair !== null);
  return `#${sealLink(pairs.join('&'))}`;
}

describe('a share link', () => {
  it('opens as the run it was made from', () => {
    expect(decodeSharedRun(link())).toEqual(SHARED);
  });

  it('survives any run the game can produce', () => {
    const random = createRandomStream(11);
    const pick = (max: number): number => random.index(max + 1);
    for (let run = 0; run < 300; run++) {
      const won = random.next() < 0.5;
      const cards = STARTER_CARDS.filter(() => random.next() < 0.4).map((card) => ({
        id: card.id,
        stacks: 1 + random.index(maxStacksFor(card.rarity)),
      }));
      const lines = endingLines(won ? 'won' : 'lost');
      const result: RunResult = {
        outcome: won ? 'won' : 'lost',
        tier: random.next() < 0.5 ? 'civilian-ship' : 'viper-pilot',
        score: pick(20_000),
        cycle: 1 + pick(20),
        raiderKills: pick(400),
        heavyKills: pick(20),
        ejects: pick(60),
        fleetLeftPercent: pick(100),
        resurrectionShipPercent: won ? 100 : pick(99),
        mostKilled: random.next() < 0.5 ? null : { identityId: pick(50), kills: 2 + pick(30), reaction: pick(20) },
        cards,
        headlineId: lines[random.index(lines.length)]?.id ?? 'x',
        challenge: random.next() < 0.5 ? null : { key: 'swarm', verdictId: `v-${String(pick(9))}` },
      };
      const shared: SharedRun = { result, gameVersion: `${String(pick(3))}.${String(pick(40))}.${String(pick(9))}` };

      expect(decodeSharedRun(link(shared))).toEqual(shared);
    }
  });

  it('does not show the numbers it carries', () => {
    const fragment = encodeSharedRun(SHARED);
    expect(fragment).toMatch(/^r=[A-Za-z0-9_-]+$/);
    // Not in the link, and not one base64 decode away either.
    const decoded = atob(fragment.slice('r='.length).replace(/-/g, '+').replace(/_/g, '/'));
    for (const plain of ['s=466', '466', 'lost', 'pilot', 'spoilers', 'v=2']) {
      expect(fragment).not.toContain(plain);
      expect(decoded).not.toContain(plain);
    }
  });

  it('is rejected after any one-character edit, anywhere in it', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const random = createRandomStream(5);
    // One byte longer each time, so every base64 remainder is covered, including the endings
    // where the last character has spare bits.
    for (const gameVersion of ['0.1.0', '0.1.10', '0.1.100']) {
      const fragment = encodeSharedRun({ ...SHARED, gameVersion });
      for (let at = 'r='.length; at < fragment.length; at++) {
        const original = fragment.charAt(at);
        const last = at === fragment.length - 1;
        const replacements = last
          ? Array.from(alphabet).filter((char) => char !== original)
          : [0, 1, 2].map(() => {
              let replacement = original;
              while (replacement === original) replacement = alphabet.charAt(random.index(alphabet.length));
              return replacement;
            });
        for (const replacement of replacements) {
          const edited = fragment.slice(0, at) + replacement + fragment.slice(at + 1);
          expect(decodeSharedRun(`#${edited}`), `${String(at)}: ${original} -> ${replacement}`).toBeNull();
        }
      }
      expect(decodeSharedRun(`#${fragment.slice(0, -1)}`)).toBeNull();
      expect(decodeSharedRun(`#${fragment}A`)).toBeNull();
    }
  });

  it('is ignored when the hash is something else, including an unsealed query', () => {
    for (const hash of ['', '#', '#about', '#r=', '#r=AAAA', '#r=!!!!', `#run?${sharePayload(SHARED)}`, `#${sharePayload(SHARED)}`]) {
      expect(decodeSharedRun(hash), hash).toBeNull();
    }
  });

  it('is rejected whole when a field is missing, malformed, or out of range', () => {
    const bad: [string, string | null][] = [
      ['v', '3'],
      ['g', 'latest'],
      ['g', null],
      ['o', 'draw'],
      ['t', 'admiral'],
      ['s', '-5'],
      ['s', '1e3'],
      ['s', '12.5'],
      ['s', '99999999'],
      ['s', null],
      ['c', '0'],
      ['f', '101'],
      ['r', '100.0'],
      ['l', '<b>hi</b>'],
      ['m', '7:1:0'],
      ['m', '7:14'],
      ['m', '7:14:1000'],
      ['m', '7:14:0:1'],
      ['u', 'spoilers:3'],
      ['u', 'spoilers:1,spoilers:1'],
      ['u', 'spoilers'],
      ['u', 'Spoilers:1'],
    ];
    for (const [key, value] of bad) {
      expect(decodeSharedRun(withField(key, value)), `${key}=${String(value)}`).toBeNull();
    }
  });

  it('is rejected when a key repeats or it is far too long', () => {
    expect(decodeSharedRun(`#${sealLink(`${sharePayload(SHARED)}&s=9999`)}`)).toBeNull();
    expect(decodeSharedRun(`#${sealLink(`${sharePayload(SHARED)}&x=${'a'.repeat(800)}`)}`)).toBeNull();
  });

  it('is rejected for a win the game cannot produce: the ship still flying', () => {
    const won: SharedRun = { ...SHARED, result: { ...LOSS, outcome: 'won', resurrectionShipPercent: 90, headlineId: 'won-01' } };
    expect(decodeSharedRun(link(won))).toBeNull();
    const real: SharedRun = { ...won, result: { ...won.result, resurrectionShipPercent: 100 } };
    expect(decodeSharedRun(link(real))).toEqual(real);
  });

  it('drops a card the game no longer has, and keeps the rest', () => {
    const decoded = decodeSharedRun(withField('u', 'retired-card:2,spoilers:2'));
    expect(decoded?.result.cards).toEqual([{ id: 'spoilers', stacks: 2 }]);
  });

  it('ignores a field it does not know, so a later version can add one', () => {
    expect(decodeSharedRun(`#${sealLink(`${sharePayload(SHARED)}&z=1`)}`)).toEqual(SHARED);
  });

  it('carries the challenge and its verdict, together or not at all', () => {
    const challenged: SharedRun = { ...SHARED, result: { ...LOSS, challenge: { key: 'swarm', verdictId: 's-mid-2' } } };
    expect(decodeSharedRun(link(challenged))).toEqual(challenged);
    const payload = sharePayload(challenged);
    for (const broken of [
      payload.replace('&j=s-mid-2', ''),
      payload.replace('x=swarm&', ''),
      payload.replace('x=swarm', 'x=Swarm'),
      // 2025 has 52 weeks.
      payload.replace('x=swarm', 'x=weekly:2025-W53'),
      payload.replace('x=swarm', 'x=weekly:2026-W00'),
      payload.replace('j=s-mid-2', 'j=<i>'),
    ]) {
      expect(decodeSharedRun(`#${sealLink(broken)}`), broken).toBeNull();
    }
  });

  it('carries a weekly challenge by its week', () => {
    const weekly: SharedRun = { ...SHARED, result: { ...LOSS, challenge: { key: 'weekly:2026-W53', verdictId: 'w-mid-1' } } };
    expect(decodeSharedRun(link(weekly))).toEqual(weekly);
  });

  it('carries an Endless run as held, and only as a challenge with no ship hurt', () => {
    const held: SharedRun = {
      ...SHARED,
      result: { ...LOSS, outcome: 'held', resurrectionShipPercent: 0, headlineId: 'held-01', challenge: { key: 'endless', verdictId: 'e-mid-1' } },
    };
    expect(decodeSharedRun(link(held))).toEqual(held);
    expect(decodeSharedRun(link({ ...held, result: { ...held.result, challenge: null } }))).toBeNull();
    expect(decodeSharedRun(link({ ...held, result: { ...held.result, resurrectionShipPercent: 12 } }))).toBeNull();
    // Version 1 had no challenges, so it had no held runs either.
    const v1 = sharePayload({ ...held, result: { ...held.result, challenge: null } }).replace('v=2', 'v=1');
    expect(decodeSharedRun(`#${sealLink(v1)}`)).toBeNull();
  });

  it('opens a challenge this version does not know, so the page can call it retired', () => {
    const retired: SharedRun = { ...SHARED, result: { ...LOSS, challenge: { key: 'gone-now', verdictId: 'x-1' } } };
    expect(decodeSharedRun(link(retired))).toEqual(retired);
  });

  it('still opens a version 1 link, as a Story mode result', () => {
    const v1 = sharePayload(SHARED).replace('v=2', 'v=1');
    expect(decodeSharedRun(`#${sealLink(v1)}`)).toEqual(SHARED);
    // Version 1 had no challenges, so one that names a challenge was not written by the game.
    expect(decodeSharedRun(`#${sealLink(`${v1}&x=swarm&j=s-low-1`)}`)).toBeNull();
  });

  it('checks stacks against the card, not a global limit', () => {
    const questionable = STARTER_CARDS.find((card) => card.rarity === 'questionable');
    expect(questionable).toBeDefined();
    const id = questionable?.id ?? 'imaginary-six';
    expect(maxStacksFor(cardDefinition(id).rarity)).toBe(1);
    expect(decodeSharedRun(withField('u', `${id}:2`))).toBeNull();
    expect(decodeSharedRun(withField('u', `${id}:1`))).not.toBeNull();
  });
});

describe('the headline a link names', () => {
  it('falls back to the first line of its outcome when the id is gone', () => {
    const first = endingLines('lost')[0];
    expect(endingFor('lost', 'lost-that-was-cut')).toEqual(first);
    expect(endingFor('won', 'lost-02').id).toBe(endingLines('won')[0]?.id);
  });

  it('puts a reaction after the most-killed stat, and the first one when a link names one that is gone', () => {
    const first = mostKilledLine(7, 14, 0);
    expect(first).toMatch(/^.*7.*14.*\S+ \S+/);
    expect(mostKilledLine(7, 14, 999)).toBe(first);
  });

  it('fills numbers and leaves anything else as written', () => {
    expect(fillEnding('{score} points over {cycles} jumps, {name}', { score: 1885, cycles: 7 })).toBe(
      '1,885 points over 7 jumps, {name}',
    );
  });
});
