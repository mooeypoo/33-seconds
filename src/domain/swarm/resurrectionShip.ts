import { clamp, WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { RandomStream } from '../shared/random';
import type { ResurrectionShipView } from '../views';

/**
 * Focused fire should take about two to three cycles (PRD decision 3). Five shots a second,
 * landing maybe a third of them, is about 50 a cycle. ASSUMPTION: 60 HP until play retunes it.
 */
export const RESURRECTION_SHIP_HIT_POINTS = 60;

export const RESURRECTION_SHIP_HALF_WIDTH_UNITS = 18;
export const RESURRECTION_SHIP_HALF_HEIGHT_UNITS = 10;
export const RESURRECTION_SHIP_RADIUS_UNITS = 16;

/** Cycle the ship first jumps in, still shielded (PRD 5.2). Tests can start it earlier. */
export const RESURRECTION_SHIP_ARRIVES_CYCLE = 2;

/** Cycle the shield drops and HP can be chipped (PRD 5.2). */
export const RESURRECTION_SHIP_VULNERABLE_CYCLE = 4;

/**
 * High on the right, above the dogfight. A later path can replace this station.
 * 0.14 of 480 wu is about 67 wu from the top, up from 0.22 so it reads as a landmark.
 */
export const RESURRECTION_SHIP_SPAWN_X_UNITS = WORLD_WIDTH_UNITS - RESURRECTION_SHIP_HALF_WIDTH_UNITS - 8;
export const RESURRECTION_SHIP_SPAWN_Y_UNITS = WORLD_HEIGHT_UNITS * 0.14;

/** How far left of home the station-keeping wander may go, in world units. */
export const RESURRECTION_SHIP_DRIFT_RANGE_UNITS = 16;

/** A couple of units past home, so it is not glued to the leftward side of the box. */
const DRIFT_RIGHT_SLACK_UNITS = 3;

/** Slow on purpose: a nudge, not a patrol. */
const DRIFT_MIN_SPEED_UNITS_PER_SECOND = 4;
const DRIFT_MAX_SPEED_UNITS_PER_SECOND = 8;

/** Ignore a new target closer than this, so it does not jitter in place. */
const DRIFT_MIN_LEG_UNITS = 5;

/**
 * The resurrection ship. HP persists across jumps. Destroying it stops new downloads (PRD 5.2, 6).
 * ASSUMPTION: a slow, seeded wander is station-keeping, not a path. Following the fleet still
 * means it survives the jump.
 */
export class ResurrectionShip {
  private hull: number;
  private readonly maxHull: number;
  private shielded: boolean;
  private readonly homeX = RESURRECTION_SHIP_SPAWN_X_UNITS;
  private readonly positionY = RESURRECTION_SHIP_SPAWN_Y_UNITS;
  private positionX = RESURRECTION_SHIP_SPAWN_X_UNITS;
  private previousPositionX = RESURRECTION_SHIP_SPAWN_X_UNITS;
  private previousPositionY = RESURRECTION_SHIP_SPAWN_Y_UNITS;
  private targetX = RESURRECTION_SHIP_SPAWN_X_UNITS;
  private speedUnitsPerSecond = DRIFT_MIN_SPEED_UNITS_PER_SECOND;
  private needsTarget = true;

  constructor(hitPoints: number = RESURRECTION_SHIP_HIT_POINTS, shielded = false) {
    this.hull = hitPoints;
    this.maxHull = hitPoints;
    this.shielded = shielded;
  }

  get x(): number {
    return this.positionX;
  }

  get y(): number {
    return this.positionY;
  }

  get hp(): number {
    return this.hull;
  }

  get isDestroyed(): boolean {
    return this.hull <= 0;
  }

  get isShielded(): boolean {
    return this.shielded && this.hull > 0;
  }

  /** Drops the shield. Returns true the tick it first goes down. */
  expose(): boolean {
    if (!this.shielded) return false;
    this.shielded = false;
    return true;
  }

  /**
   * Slow station-keeping. Own random stream, so this cannot steal spawn rolls (ADR-0001 D3).
   */
  advance(tickSeconds: number, random: RandomStream): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    if (this.hull <= 0) return;

    if (this.needsTarget || Math.abs(this.positionX - this.targetX) <= 0.4) {
      this.pickLeg(random);
    }

    const remaining = this.targetX - this.positionX;
    const step = this.speedUnitsPerSecond * tickSeconds;
    if (Math.abs(remaining) <= step) {
      this.positionX = this.targetX;
      return;
    }
    this.positionX += Math.sign(remaining) * step;
  }

  takeHit(): boolean {
    if (this.hull <= 0 || this.shielded) return false;
    this.hull -= 1;
    return this.hull <= 0;
  }

  toView(): ResurrectionShipView {
    return {
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      hp: this.hull,
      hpMax: this.maxHull,
      destroyed: this.isDestroyed,
      shielded: this.isShielded,
    };
  }

  private pickLeg(random: RandomStream): void {
    const minX = this.homeX - RESURRECTION_SHIP_DRIFT_RANGE_UNITS;
    const maxX = Math.min(
      this.homeX + DRIFT_RIGHT_SLACK_UNITS,
      WORLD_WIDTH_UNITS - RESURRECTION_SHIP_HALF_WIDTH_UNITS - 4,
    );
    let next = this.positionX;
    for (let attempt = 0; attempt < 4; attempt++) {
      next = random.between(minX, maxX);
      if (Math.abs(next - this.positionX) >= DRIFT_MIN_LEG_UNITS) break;
    }
    this.targetX = clamp(next, minX, maxX);
    this.speedUnitsPerSecond = random.between(DRIFT_MIN_SPEED_UNITS_PER_SECOND, DRIFT_MAX_SPEED_UNITS_PER_SECOND);
    this.needsTarget = false;
  }
}
