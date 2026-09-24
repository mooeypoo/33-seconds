import { describe, expect, it } from 'vitest';
import { drawFleetNames, fleetNamesForRun } from '../src/application/fleetRoster';
import { CIVILIAN_SHIP_COUNT, GALACTICA_SHIP_INDEX } from '../src/domain/fleet/integrity';
import { createRandomStream } from '../src/domain/shared/random';

const POOL = Array.from({ length: 25 }, (_, index) => `Freighter ${String(index + 1)}`);

describe('the fleet roster', () => {
  it('names every hull once, with Galactica always in her slot', () => {
    const names = drawFleetNames(createRandomStream(7), { galactica: 'Galactica', civilianNames: POOL });
    expect(names).toHaveLength(CIVILIAN_SHIP_COUNT);
    expect(names[GALACTICA_SHIP_INDEX]).toBe('Galactica');
    const civilians = names.filter((_, index) => index !== GALACTICA_SHIP_INDEX);
    expect(new Set(civilians).size).toBe(civilians.length);
    for (const name of civilians) expect(POOL).toContain(name);
  });

  it('draws the same roster for the same run seed, and a different one for another', () => {
    expect(fleetNamesForRun(11)).toEqual(fleetNamesForRun(11));
    const rosters = new Set([1, 2, 3, 4, 5].map((seed) => fleetNamesForRun(seed).join('|')));
    expect(rosters.size).toBeGreaterThan(1);
  });

  it('pads a short pool with numbered names instead of repeating one', () => {
    const names = drawFleetNames(createRandomStream(3), { galactica: 'Galactica', civilianNames: ['Only One', 'Only One', ' '] });
    const civilians = names.filter((_, index) => index !== GALACTICA_SHIP_INDEX);
    expect(civilians.filter((name) => name === 'Only One')).toHaveLength(1);
    expect(new Set(civilians).size).toBe(civilians.length);
  });
});
