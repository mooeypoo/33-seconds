import fleet from '../content/fleet.json';
import { CIVILIAN_SHIP_COUNT, GALACTICA_SHIP_INDEX } from '../domain/fleet/integrity';
import { createRandomStream, type RandomStream } from '../domain/shared/random';

/**
 * Names for the hulls on the fleet line (PRD 7.4). Galactica is fixed; the civilians are drawn from
 * an owner-written pool each run, so runs look different. Cosmetic only: it has its own stream, so
 * a name can never change the fight (ADR-0001 D3).
 */
export interface FleetRosterSource {
  readonly galactica: string;
  readonly civilianNames: readonly string[];
}

/** Galactica's place on the fleet line, for the overlay's ship list. */
export const GALACTICA_SLOT = GALACTICA_SHIP_INDEX;

/** XOR'd with the run seed so the roster has its own stream, like comms. */
export function rosterSeed(runSeed: number): number {
  return (runSeed ^ 0xf1ee7) >>> 0;
}

/**
 * One name per hull, in fleet-line order, with Galactica at its fixed slot and no civilian repeated.
 * A pool shorter than the fleet is padded with plain numbered names rather than repeating one.
 */
export function drawFleetNames(
  random: RandomStream,
  source: FleetRosterSource = fleet,
  shipCount = CIVILIAN_SHIP_COUNT,
  galacticaIndex = GALACTICA_SHIP_INDEX,
): string[] {
  const pool = [...new Set(source.civilianNames.map((name) => name.trim()).filter((name) => name.length > 0))];
  for (let index = pool.length - 1; index > 0; index--) {
    const swap = random.index(index + 1);
    const current = pool[index];
    const other = pool[swap];
    if (current === undefined || other === undefined) continue;
    pool[index] = other;
    pool[swap] = current;
  }
  const names: string[] = [];
  let drawn = 0;
  for (let slot = 0; slot < shipCount; slot++) {
    if (slot === galacticaIndex) {
      names.push(source.galactica);
      continue;
    }
    names.push(pool[drawn] ?? `Civilian ${String(slot + 1)}`);
    drawn += 1;
  }
  return names;
}

/** The roster for one run. */
export function fleetNamesForRun(runSeed: number): string[] {
  return drawFleetNames(createRandomStream(rosterSeed(runSeed)));
}
