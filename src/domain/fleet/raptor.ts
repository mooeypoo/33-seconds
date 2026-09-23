import { clamp, WORLD_WIDTH_UNITS } from '../shared/world';
import { FLEET_LINE_Y_UNITS } from './integrity';
import type { RaptorView } from '../views';

/** Hits before the escort hangars until the next cycle (PRD 10.2). */
export const RAPTOR_HIT_POINTS = 3;

/** Slow patrol along the fleet line. Fast enough to cover a column, not a dodge. */
export const RAPTOR_SPEED_UNITS_PER_SECOND = 40;

/**
 * Soak radius at the line. ASSUMPTION: 10 wu until play. A stray whose landing x is inside this
 * of a Raptor is eaten; strafes still land.
 */
export const RAPTOR_RADIUS_UNITS = 10;

export const RAPTOR_HALF_WIDTH_UNITS = 7;
export const RAPTOR_HALF_HEIGHT_UNITS = 3;

/** A little above the civilian hulls so the escort is readable. */
export const RAPTOR_Y_UNITS = FLEET_LINE_Y_UNITS - 10;

const EDGE_PAD_UNITS = 16;

/**
 * One Raptor escort. Patrols, soaks strays, hangars after three hits, and relaunches next cycle.
 */
export class Raptor {
  readonly id: number;
  private positionX: number;
  private previousPositionX: number;
  private readonly positionY = RAPTOR_Y_UNITS;
  private previousPositionY = RAPTOR_Y_UNITS;
  private direction: number;
  private hull: number = RAPTOR_HIT_POINTS;
  private hangared = false;
  private readonly worldWidth: number;

  constructor(id: number, x: number, direction: number, worldWidth: number = WORLD_WIDTH_UNITS) {
    this.id = id;
    this.worldWidth = worldWidth;
    this.positionX = clamp(x, EDGE_PAD_UNITS, worldWidth - EDGE_PAD_UNITS);
    this.previousPositionX = this.positionX;
    this.direction = direction < 0 ? -1 : 1;
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

  get isHangared(): boolean {
    return this.hangared;
  }

  get isOnStation(): boolean {
    return !this.hangared;
  }

  canSoak(x: number): boolean {
    return this.isOnStation && Math.abs(this.positionX - x) <= RAPTOR_RADIUS_UNITS;
  }

  advance(tickSeconds: number): void {
    if (this.hangared) return;
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.positionX += this.direction * RAPTOR_SPEED_UNITS_PER_SECOND * tickSeconds;
    const minX = EDGE_PAD_UNITS;
    const maxX = this.worldWidth - EDGE_PAD_UNITS;
    if (this.positionX <= minX) {
      this.positionX = minX;
      this.direction = 1;
    } else if (this.positionX >= maxX) {
      this.positionX = maxX;
      this.direction = -1;
    }
  }

  /** Returns true when this hit sent the escort to hangar. */
  takeHit(): boolean {
    if (this.hangared) return false;
    this.hull -= 1;
    if (this.hull > 0) return false;
    this.hangared = true;
    return true;
  }

  toView(): RaptorView {
    return {
      id: this.id,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      hp: this.hull,
      hpMax: RAPTOR_HIT_POINTS,
      hangared: this.hangared,
    };
  }
}

/** Spread escorts along the line so two stacks are not a pile. */
export function raptorLaunchX(index: number, count: number, worldWidth: number = WORLD_WIDTH_UNITS): number {
  const span = worldWidth - EDGE_PAD_UNITS * 2;
  return EDGE_PAD_UNITS + ((index + 1) / (count + 1)) * span;
}
