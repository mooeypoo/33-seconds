import { WORLD_HEIGHT_UNITS } from '../shared/world';

/** The run's real health bar. 100 is full. The only way to lose (PRD 7). */
export const FLEET_INTEGRITY_MAX = 100;

/** Damage from one stray that reaches the fleet line. About 1% (PRD 7.1). */
export const FLEET_DAMAGE_PER_STRAY = 1;

/**
 * No single cycle can take more than this much integrity (PRD 7.2). Civilian Ship's 35% until
 * tiers exist.
 */
export const FLEET_CYCLE_DAMAGE_CAP = 35;

/** Fraction of *missing* integrity restored at each jump (PRD 7.2). Civilian 60% until tiers. */
export const FLEET_REPAIR_OF_MISSING = 0.6;

/**
 * The civilian line along the bottom. A stray that crosses it hits a ship. Below the Viper spawn,
 * so standing in front of the fleet is bodyguarding (PRD 7.1).
 */
export const FLEET_LINE_Y_UNITS = WORLD_HEIGHT_UNITS - 16;

/**
 * Fleet Integrity. Partial repair at the jump. A per-cycle cap so one bad 33 cannot end the run.
 * ASSUMPTION: Galactica's flak (40% of strays) waits; every stray that crosses the line hits,
 * so the first play of the pool is readable and deterministic.
 */
export class Fleet {
  private integrity = FLEET_INTEGRITY_MAX;
  private damageThisCycle = 0;

  get view(): { readonly integrity: number; readonly integrityMax: number; readonly damageThisCycle: number } {
    return {
      integrity: this.integrity,
      integrityMax: FLEET_INTEGRITY_MAX,
      damageThisCycle: this.damageThisCycle,
    };
  }

  /**
   * Applies one stray, honouring the per-cycle cap and a floor of zero. Returns the damage
   * actually taken (0 when the cap or the floor is already spent).
   */
  takeStray(): number {
    const room = Math.min(FLEET_DAMAGE_PER_STRAY, FLEET_CYCLE_DAMAGE_CAP - this.damageThisCycle, this.integrity);
    if (room <= 0) return 0;
    this.integrity -= room;
    this.damageThisCycle += room;
    return room;
  }

  /** Tyrol's opposite number: a fraction of what is missing, then the cycle cap resets. */
  repairAtJump(): void {
    const missing = FLEET_INTEGRITY_MAX - this.integrity;
    this.integrity += missing * FLEET_REPAIR_OF_MISSING;
    this.damageThisCycle = 0;
  }
}
