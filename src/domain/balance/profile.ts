/**
 * Numbers that differ by difficulty (ADR-0001 D9, ADR-0002 Phase 3). Play loads them from
 * `src/balance/tiers.json`. Tests that omit a profile get `DEFAULT_CYCLE_PROFILE` (defaultProfile.ts),
 * built from the domain's constants, so existing numbers stay put. This file imports nothing, so
 * every module can use the types without a cycle.
 *
 * A **ramp** is a list of values by cycle: the first is cycle 1, and the last one repeats for every
 * cycle after the list ends. `[3]` is "3 every cycle"; `[3, 4, 5, 6]` climbs to 6 and stays.
 */
export type TierId = 'civilian-ship' | 'viper-pilot';

export type Ramp = readonly number[];

export interface CycleProfile {
  readonly id: TierId;
  /** Per-cycle fleet damage cap (integrity points). */
  readonly fleetCycleDamageCap: number;
  /** Fraction of missing Fleet Integrity restored at the jump. */
  readonly fleetRepairOfMissing: number;
  /** Most Raiders alive at once, by cycle (PRD 9). Returns refill up to it and never past it. */
  readonly directorCap: Ramp;
  /**
   * Fewest Raiders alive, by cycle, while the resurrection ship lives (PRD 9). Below it, fresh
   * Raiders arrive even while downloads are pending, so a run of kills does not empty the sky.
   */
  readonly swarmFloor: Ramp;
  /** Each download takes the base time plus or minus up to this, so returns are staggered (PRD 6). */
  readonly downloadJitterSeconds: number;
  /** Share of new Raiders, 0 to 1 by cycle, that weave a shallow sine instead of diving straight. */
  readonly sineShare: Ramp;
  /** Raiders allowed to fire at once, by cycle (PRD 9). */
  readonly attackTokens: Ramp;
  /** Raiders allowed to dive the fleet at once, by cycle (PRD 7.1). */
  readonly strafeTokens: Ramp;
}

/** The ramp's value for a cycle (1-based). The last value holds for every later cycle. */
export function rampAt(ramp: Ramp, cycleIndex: number): number {
  if (ramp.length === 0) return 0;
  const index = Math.min(Math.max(cycleIndex, 1), ramp.length) - 1;
  return ramp[index] ?? 0;
}

export function isTierId(id: string): id is TierId {
  return id === 'civilian-ship' || id === 'viper-pilot';
}
