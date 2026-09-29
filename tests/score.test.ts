import { describe, expect, it } from 'vitest';
import { RunTally, scoreEndlessRun, scoreRun, type RunFacts, type ScoreWeights } from '../src/domain/scoring/score';
import type { DomainEvent } from '../src/domain/shared/events';
import { createRandomStream } from '../src/domain/shared/random';

/** Round numbers, so each expectation can be read off by hand. Not the shipped weights. */
const WEIGHTS: ScoreWeights = {
  raiderKill: 10,
  heavyKill: 40,
  resurrectionShipDamage: 2,
  resurrectionShipDestroyed: 500,
  eject: 20,
  fleetDamagePercent: 2,
  winBonus: 250,
  fleetLeftPercent: 10,
  jumpHeld: 100,
};

const QUIET_LOSS: RunFacts = {
  won: false,
  cycle: 3,
  raiderKills: 0,
  heavyKills: 0,
  resurrectionShipDamage: 0,
  resurrectionShipDestroyed: false,
  ejects: 0,
  fleetDamagePercent: 0,
  fleetLeftPercent: 0,
  mostKilled: null,
};

describe('the Endless score', () => {
  it('counts the jumps the fleet made, the kills, and the ejects, and nothing about the fleet or a ship', () => {
    // Ended in cycle 6: five jumps. 500 + 300 + 80 - 60.
    const facts: RunFacts = { ...QUIET_LOSS, cycle: 6, raiderKills: 30, heavyKills: 2, ejects: 3, fleetDamagePercent: 900 };
    expect(scoreEndlessRun(facts, WEIGHTS)).toBe(820);
    // The Story score for the same run is buried under the fleet damage a long run always takes.
    expect(scoreRun(facts, WEIGHTS)).toBe(0);
  });

  it('gives one more jump more than one more kill, and never goes below zero', () => {
    const base: RunFacts = { ...QUIET_LOSS, cycle: 8, raiderKills: 40 };
    expect(scoreEndlessRun({ ...base, cycle: 9 }, WEIGHTS)).toBeGreaterThan(scoreEndlessRun({ ...base, raiderKills: 41 }, WEIGHTS));
    expect(scoreEndlessRun({ ...QUIET_LOSS, cycle: 1, ejects: 5 }, WEIGHTS)).toBe(0);
  });
});

describe('the score', () => {
  it('adds kills, ship damage and the kill bonus, and takes off ejects and fleet damage', () => {
    const facts: RunFacts = {
      ...QUIET_LOSS,
      raiderKills: 30,
      heavyKills: 2,
      resurrectionShipDamage: 50,
      resurrectionShipDestroyed: true,
      ejects: 3,
      fleetDamagePercent: 40,
    };
    // 300 + 80 + 100 + 500 - 60 - 80
    expect(scoreRun(facts, WEIGHTS)).toBe(840);
  });

  it('gives the win bonus and the fleet left only for a win', () => {
    const lost: RunFacts = { ...QUIET_LOSS, raiderKills: 10, fleetLeftPercent: 60 };
    const won: RunFacts = { ...lost, won: true };

    expect(scoreRun(lost, WEIGHTS)).toBe(100);
    expect(scoreRun(won, WEIGHTS)).toBe(100 + 250 + 600);
  });

  it('never goes below zero, however badly the fleet did', () => {
    const disaster: RunFacts = { ...QUIET_LOSS, raiderKills: 1, ejects: 40, fleetDamagePercent: 900 };
    expect(scoreRun(disaster, WEIGHTS)).toBe(0);
  });

  it('is a whole number even with fractional weights', () => {
    const score = scoreRun({ ...QUIET_LOSS, raiderKills: 3 }, { ...WEIGHTS, raiderKill: 3.3 });
    expect(score).toBe(10);
  });

  it('never drops for one more kill, and never rises for one more eject or more fleet damage', () => {
    const random = createRandomStream(7);
    const pick = (max: number): number => random.index(max + 1);
    for (let run = 0; run < 500; run++) {
      const facts: RunFacts = {
        won: random.next() < 0.5,
        cycle: 1 + pick(12),
        raiderKills: pick(200),
        heavyKills: pick(10),
        resurrectionShipDamage: pick(60),
        resurrectionShipDestroyed: random.next() < 0.5,
        ejects: pick(30),
        fleetDamagePercent: pick(400),
        fleetLeftPercent: pick(100),
        mostKilled: null,
      };
      const score = scoreRun(facts, WEIGHTS);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(scoreRun({ ...facts, raiderKills: facts.raiderKills + 1 }, WEIGHTS)).toBeGreaterThanOrEqual(score);
      expect(scoreRun({ ...facts, heavyKills: facts.heavyKills + 1 }, WEIGHTS)).toBeGreaterThanOrEqual(score);
      expect(scoreRun({ ...facts, ejects: facts.ejects + 1 }, WEIGHTS)).toBeLessThanOrEqual(score);
      expect(scoreRun({ ...facts, fleetDamagePercent: facts.fleetDamagePercent + 1 }, WEIGHTS)).toBeLessThanOrEqual(score);
      expect(scoreRun({ ...facts, won: true }, WEIGHTS)).toBeGreaterThanOrEqual(scoreRun({ ...facts, won: false }, WEIGHTS));
    }
  });
});

function spawned(id: number, identityId: number, heavy = false): DomainEvent {
  return { type: 'RaiderSpawned', id, identityId, x: 0, y: 0, returned: false, deaths: 0, heavy };
}

function destroyed(id: number, heavy = false): DomainEvent {
  return { type: 'RaiderDestroyed', id, x: 0, y: 0, heavy };
}

/** Only the parts of a view the tally reads. */
function endView(integrity: number, ship: { hp: number; hpMax: number; destroyed: boolean } | null) {
  return {
    cycle: { cycleIndex: 4 },
    fleet: { integrity, integrityMax: 100 },
    resurrectionShip: ship,
  } as unknown as Parameters<RunTally['facts']>[0];
}

describe('the run tally', () => {
  it('credits every death of a returning Raider to the same identity', () => {
    const tally = new RunTally();
    // Identity 5 dies three times in three bodies; identity 2 dies twice.
    tally.note([spawned(1, 5), spawned(2, 2), destroyed(1), destroyed(2)]);
    tally.note([spawned(3, 5), destroyed(3), spawned(4, 2), destroyed(4)]);
    tally.note([spawned(5, 5), destroyed(5)]);

    const facts = tally.facts(endView(80, null), false);
    expect(facts.raiderKills).toBe(5);
    expect(facts.mostKilled).toEqual({ identityId: 5, kills: 3 });
  });

  it('breaks a tie toward the lower identity, and names nobody who died only once', () => {
    const tie = new RunTally();
    tie.note([spawned(1, 9), destroyed(1), spawned(2, 9), destroyed(2), spawned(3, 4), destroyed(3), spawned(4, 4), destroyed(4)]);
    expect(tie.facts(endView(80, null), false).mostKilled).toEqual({ identityId: 4, kills: 2 });

    const once = new RunTally();
    once.note([spawned(1, 1), destroyed(1), spawned(2, 2), destroyed(2)]);
    expect(once.facts(endView(80, null), false).mostKilled).toBeNull();
  });

  it('counts a heavy Raider apart, and never as the most-killed', () => {
    const tally = new RunTally();
    tally.note([spawned(1, 3, true), destroyed(1, true), spawned(2, 3, true), destroyed(2, true)]);

    const facts = tally.facts(endView(80, null), false);
    expect(facts.heavyKills).toBe(2);
    expect(facts.raiderKills).toBe(0);
    expect(facts.mostKilled).toBeNull();
  });

  it('keeps every point of fleet damage, even the part a jump repaired', () => {
    const tally = new RunTally();
    tally.note([
      { type: 'FleetHit', damage: 30, integrity: 70, x: 0, shipId: 1, kind: 'strafe' },
      { type: 'FleetRepaired', integrity: 90 },
      { type: 'FleetHit', damage: 25, integrity: 65, x: 0, shipId: 2, kind: 'stray' },
      { type: 'ViperEjected', x: 0, y: 0 },
    ]);

    const facts = tally.facts(endView(65, null), false);
    expect(facts.fleetDamagePercent).toBe(55);
    expect(facts.fleetLeftPercent).toBe(65);
    expect(facts.ejects).toBe(1);
  });

  it('reads the resurrection ship off the end view: none, chipped, or gone', () => {
    const tally = new RunTally();
    expect(tally.facts(endView(50, null), false).resurrectionShipDamage).toBe(0);

    const chipped = tally.facts(endView(50, { hp: 30, hpMax: 40, destroyed: false }), false);
    expect(chipped.resurrectionShipDamage).toBe(10);
    expect(chipped.resurrectionShipDestroyed).toBe(false);

    const gone = tally.facts(endView(50, { hp: 0, hpMax: 40, destroyed: true }), true);
    expect(gone.resurrectionShipDamage).toBe(40);
    expect(gone.resurrectionShipDestroyed).toBe(true);
    expect(gone.cycle).toBe(4);
  });
});
