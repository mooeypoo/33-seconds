import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { CivilianShipView, FleetView } from '../views';

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

/** Ten placeholders, matching the HUD pips. Silly names wait for the pause menu. */
export const CIVILIAN_SHIP_COUNT = 10;

export const CIVILIAN_HALF_WIDTH_UNITS = 8;
export const CIVILIAN_HALF_HEIGHT_UNITS = 3;

/**
 * The slightly larger hull in the middle. Visual only: no flak, no extra HP.
 * ASSUMPTION: Galactica sits in the line with the civilians until it has its own rules.
 */
export const GALACTICA_SHIP_INDEX = 4;

const EDGE_PAD_UNITS = 18;

export function civilianShipX(index: number): number {
  const span = WORLD_WIDTH_UNITS - EDGE_PAD_UNITS * 2;
  return EDGE_PAD_UNITS + ((index + 0.5) / CIVILIAN_SHIP_COUNT) * span;
}

export function nearestCivilianShipIndex(x: number): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < CIVILIAN_SHIP_COUNT; index++) {
    const distance = Math.abs(civilianShipX(index) - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Fleet Integrity. Partial repair at the jump. A per-cycle cap so one bad 33 cannot end the run.
 * ASSUMPTION: Galactica's flak (40% of strays) waits; every stray that crosses the line hits,
 * so the first play of the pool is readable and deterministic.
 */
export class Fleet {
  private integrity = FLEET_INTEGRITY_MAX;
  private damageThisCycle = 0;
  private lastHitShipId: number | null = null;

  get view(): FleetView {
    const healthyCount = Math.round((this.integrity / FLEET_INTEGRITY_MAX) * CIVILIAN_SHIP_COUNT);
    const ships: CivilianShipView[] = [];
    for (let id = 0; id < CIVILIAN_SHIP_COUNT; id++) {
      ships.push({
        id,
        x: civilianShipX(id),
        y: FLEET_LINE_Y_UNITS,
        galactica: id === GALACTICA_SHIP_INDEX,
        healthy: id < healthyCount,
        justHit: this.lastHitShipId === id,
      });
    }
    return {
      integrity: this.integrity,
      integrityMax: FLEET_INTEGRITY_MAX,
      damageThisCycle: this.damageThisCycle,
      lastHitShipId: this.lastHitShipId,
      ships,
    };
  }

  /**
   * Applies one stray, honouring the per-cycle cap and a floor of zero. Returns the damage
   * actually taken (0 when the cap or the floor is already spent). `x` picks which hull shows the
   * hit; omitted shots land on the centre ship.
   */
  takeStray(x: number = WORLD_WIDTH_UNITS / 2): number {
    const room = Math.min(FLEET_DAMAGE_PER_STRAY, FLEET_CYCLE_DAMAGE_CAP - this.damageThisCycle, this.integrity);
    if (room <= 0) return 0;
    this.integrity -= room;
    this.damageThisCycle += room;
    this.lastHitShipId = nearestCivilianShipIndex(x);
    return room;
  }

  /** Tyrol's opposite number: a fraction of what is missing, then the cycle cap resets. */
  repairAtJump(): void {
    const missing = FLEET_INTEGRITY_MAX - this.integrity;
    this.integrity += missing * FLEET_REPAIR_OF_MISSING;
    this.damageThisCycle = 0;
    this.lastHitShipId = null;
  }
}
