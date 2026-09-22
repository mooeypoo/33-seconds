/**
 * Numbers that differ by difficulty (ADR-0001 D9). Play injects a profile from `src/balance`.
 * Tests that omit one get Civilian Run numbers, so existing cap math stays put.
 *
 * Knob budget: only the fields that already differ. Director cap, hull, and tokens stay
 * constants until a tier actually changes them.
 */
export type TierId = 'civilian-ship' | 'viper-pilot';

export interface CycleProfile {
  readonly id: TierId;
  /** Per-cycle fleet damage cap (integrity points). */
  readonly fleetCycleDamageCap: number;
  /** Fraction of missing Fleet Integrity restored at the jump. */
  readonly fleetRepairOfMissing: number;
}

export function isTierId(id: string): id is TierId {
  return id === 'civilian-ship' || id === 'viper-pilot';
}
