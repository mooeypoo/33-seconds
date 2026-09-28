import { clamp, WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { CivilianShipView, FleetView } from '../views';

/** The run's real health bar. 100 is full. The only way to lose (PRD 7). */
export const FLEET_INTEGRITY_MAX = 100;

/** Damage from one stray that reaches the fleet line. About 1% (PRD 7.1). */
export const FLEET_DAMAGE_PER_STRAY = 1;

/**
 * A strafing Raider that reaches the line. Bigger than a stray so intercepting it is the job
 * (PRD 7.1). ASSUMPTION: 8 until play says otherwise; the cycle cap still holds.
 */
export const FLEET_DAMAGE_PER_STRAFE = 8;

/**
 * No single cycle can take more than this much integrity (PRD 7.2). Civilian Run's 35%.
 * Viper Pilot uses a higher cap from the tier profile.
 */
export const FLEET_CYCLE_DAMAGE_CAP = 35;

/** Fraction of *missing* integrity restored at each jump (PRD 7.2). Civilian Run's 60%. */
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
 * The wider hull, fourth from the left. Visual only: no flak, no extra HP.
 * ASSUMPTION: Galactica sits in the line with the civilians until it has its own rules.
 */
export const GALACTICA_SHIP_INDEX = 4;

/** Galactica's hull where it crosses the line: twice a civilian's (docs/art/SPRITE-FILES.md). */
export const GALACTICA_HALF_WIDTH_UNITS = 16;

const EDGE_PAD_UNITS = 18;

/** Galactica's slot is wider by exactly its extra hull, so every gap in the line is the same. */
const GALACTICA_EXTRA_WIDTH_UNITS = (GALACTICA_HALF_WIDTH_UNITS - CIVILIAN_HALF_WIDTH_UNITS) * 2;

export function shipHalfWidthUnits(index: number): number {
  return index === GALACTICA_SHIP_INDEX ? GALACTICA_HALF_WIDTH_UNITS : CIVILIAN_HALF_WIDTH_UNITS;
}

export function civilianShipX(index: number, worldWidth: number = WORLD_WIDTH_UNITS): number {
  const span = worldWidth - EDGE_PAD_UNITS * 2;
  const slot = (span - GALACTICA_EXTRA_WIDTH_UNITS) / CIVILIAN_SHIP_COUNT;
  const left = EDGE_PAD_UNITS + index * slot + (index > GALACTICA_SHIP_INDEX ? GALACTICA_EXTRA_WIDTH_UNITS : 0);
  const width = slot + (index === GALACTICA_SHIP_INDEX ? GALACTICA_EXTRA_WIDTH_UNITS : 0);
  return left + width / 2;
}

/** The hull under `x`, else the one whose edge is closest, so a wingtip hit lands on the wide ship. */
export function nearestCivilianShipIndex(x: number, worldWidth: number = WORLD_WIDTH_UNITS): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < CIVILIAN_SHIP_COUNT; index++) {
    const fromCentre = Math.abs(civilianShipX(index, worldWidth) - x);
    const distance = Math.max(0, fromCentre - shipHalfWidthUnits(index));
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * When a hull shows as dented as integrity falls: 0 goes first. The civilians go from the right
 * end of the line, and Galactica goes last. Each hull is one pip (10 integrity) and the line rounds
 * to the nearest pip, so Galactica dents below 5, half of its own pip. Its X waits for zero.
 */
function disableOrder(index: number): number {
  if (index === GALACTICA_SHIP_INDEX) return CIVILIAN_SHIP_COUNT - 1;
  const fromRight = CIVILIAN_SHIP_COUNT - 1 - index;
  return index > GALACTICA_SHIP_INDEX ? fromRight : fromRight - 1;
}

/**
 * Fleet Integrity. Partial repair at the jump. A per-cycle cap so one bad 33 cannot end the run.
 * ASSUMPTION: Galactica's flak waits behind *Flak Enthusiast*. Without that card every stray that
 * crosses the line hits, so the first play of the pool stays readable and deterministic.
 */
export class Fleet {
  private integrity: number;
  private damageThisCycle = 0;
  /** Damage of the cycle that just jumped. Still set after the repair wipes the live counter. */
  private lastCycleDamage = 0;
  private lastHitShipId: number | null = null;
  private readonly worldWidth: number;

  constructor(startingIntegrity: number = FLEET_INTEGRITY_MAX, worldWidth: number = WORLD_WIDTH_UNITS) {
    this.integrity = clamp(startingIntegrity, 0, FLEET_INTEGRITY_MAX);
    this.worldWidth = worldWidth;
  }

  get view(): FleetView {
    const disabledCount = CIVILIAN_SHIP_COUNT - Math.round((this.integrity / FLEET_INTEGRITY_MAX) * CIVILIAN_SHIP_COUNT);
    const ships: CivilianShipView[] = [];
    for (let id = 0; id < CIVILIAN_SHIP_COUNT; id++) {
      const healthy = disableOrder(id) >= disabledCount;
      const galactica = id === GALACTICA_SHIP_INDEX;
      ships.push({
        id,
        x: civilianShipX(id, this.worldWidth),
        y: FLEET_LINE_Y_UNITS,
        galactica,
        healthy,
        disabled: galactica ? this.integrity <= 0 : !healthy,
        justHit: this.lastHitShipId === id,
      });
    }
    return {
      integrity: this.integrity,
      integrityMax: FLEET_INTEGRITY_MAX,
      damageThisCycle: this.damageThisCycle,
      lastCycleDamage: this.lastCycleDamage,
      lastHitShipId: this.lastHitShipId,
      ships,
    };
  }

  /**
   * Applies one stray, honouring the per-cycle cap and a floor of zero. Returns the damage
   * actually taken (0 when the cap or the floor is already spent). `x` picks which hull shows the
   * hit; omitted shots land on the centre ship.
   */
  takeStray(x?: number, cycleCap = FLEET_CYCLE_DAMAGE_CAP): number {
    return this.takeDamage(FLEET_DAMAGE_PER_STRAY, x ?? this.worldWidth / 2, cycleCap);
  }

  /** A body that reached the line. Same cap and floor as a stray. */
  takeStrafe(x: number, cycleCap = FLEET_CYCLE_DAMAGE_CAP): number {
    return this.takeDamage(FLEET_DAMAGE_PER_STRAFE, x, cycleCap);
  }

  private takeDamage(amount: number, x: number, cycleCap: number): number {
    const room = Math.min(amount, cycleCap - this.damageThisCycle, this.integrity);
    if (room <= 0) return 0;
    this.integrity -= room;
    this.damageThisCycle += room;
    this.lastHitShipId = nearestCivilianShipIndex(x, this.worldWidth);
    return room;
  }

  /** Tyrol's opposite number: a fraction of what is missing, then the cycle cap resets. */
  repairAtJump(repairOfMissing: number = FLEET_REPAIR_OF_MISSING): void {
    this.lastCycleDamage = this.damageThisCycle;
    const missing = FLEET_INTEGRITY_MAX - this.integrity;
    this.integrity += missing * repairOfMissing;
    this.damageThisCycle = 0;
    this.lastHitShipId = null;
  }
}
