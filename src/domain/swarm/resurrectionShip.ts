import { movingCircleHitAlong } from '../shared/collision';
import { clamp, WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { RandomStream } from '../shared/random';
import type { ResurrectionShipView } from '../views';

/**
 * Focused fire should take about two to three cycles (PRD decision 3). Five shots a second,
 * landing maybe a third of them, is about 50 a cycle. ASSUMPTION: 60 HP until play retunes it.
 */
export const RESURRECTION_SHIP_HIT_POINTS = 60;

/** Half the picture's width (96 art pixels, 48 world units), so the station keeps it all on screen. */
export const RESURRECTION_SHIP_HALF_WIDTH_UNITS = 24;

/**
 * The drawn hull is long and thin (docs/art/SPRITE-FILES.md), so it is a row of small circles, a
 * little inside the picture, not one big circle: a round hits the hull where it is drawn, not the
 * empty space under it, and not through its ends. Reach: 24 units either side, 5 above and below.
 */
export const RESURRECTION_SHIP_HULL_HALF_LENGTH_UNITS = 19;
export const RESURRECTION_SHIP_HULL_RADIUS_UNITS = 5;

/** Close enough that the dips between circles stay under a unit deep. */
const HULL_CIRCLE_COUNT = 9;

/** How far along a swept circle's path it first meets the hull, or null on a miss (see `movingCircleHitAlong`). */
export function resurrectionShipHitAlong(
  shipX: number,
  shipY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  movingRadius: number,
): number | null {
  const spacing = (RESURRECTION_SHIP_HULL_HALF_LENGTH_UNITS * 2) / (HULL_CIRCLE_COUNT - 1);
  let best: number | null = null;
  for (let index = 0; index < HULL_CIRCLE_COUNT; index++) {
    const circleX = shipX - RESURRECTION_SHIP_HULL_HALF_LENGTH_UNITS + index * spacing;
    const along = movingCircleHitAlong(startX, startY, endX, endY, movingRadius, circleX, shipY, RESURRECTION_SHIP_HULL_RADIUS_UNITS);
    if (along !== null && (best === null || along < best)) best = along;
  }
  return best;
}

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
 * How long the hangar doors stay open, then sealed, while the ship can be hurt (PRD 10.2).
 * ASSUMPTION: 4 s / 4 s until play. Starts open when the shield drops. Combat ticks only.
 */
export const BAY_OPEN_SECONDS = 4;
export const BAY_SEALED_SECONDS = 4;

/**
 * The resurrection ship. HP persists across jumps. Destroying it stops new downloads (PRD 5.2, 6).
 * ASSUMPTION: a slow, seeded wander is station-keeping, not a path. Following the fleet still
 * means it survives the jump.
 */
export class ResurrectionShip {
  private hull: number;
  private readonly maxHull: number;
  private shielded: boolean;
  private readonly homeX: number;
  private readonly worldWidth: number;
  private readonly positionY = RESURRECTION_SHIP_SPAWN_Y_UNITS;
  private positionX: number;
  private previousPositionX: number;
  private previousPositionY = RESURRECTION_SHIP_SPAWN_Y_UNITS;
  private targetX: number;
  private speedUnitsPerSecond = DRIFT_MIN_SPEED_UNITS_PER_SECOND;
  private needsTarget = true;
  private bayElapsedSeconds = 0;

  constructor(
    hitPoints: number = RESURRECTION_SHIP_HIT_POINTS,
    shielded = false,
    worldWidth: number = WORLD_WIDTH_UNITS,
  ) {
    this.hull = hitPoints;
    this.maxHull = hitPoints;
    this.shielded = shielded;
    this.worldWidth = worldWidth;
    this.homeX = worldWidth - RESURRECTION_SHIP_HALF_WIDTH_UNITS - 8;
    this.positionX = this.homeX;
    this.previousPositionX = this.homeX;
    this.targetX = this.homeX;
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

  /**
   * Open while unshielded and in the first half of the 8 s cycle. Sealed while shielded, dead, or
   * in the second half. HUD also names it, so colour is not the only cue.
   */
  get baysOpen(): boolean {
    if (this.hull <= 0 || this.shielded) return false;
    const cycle = this.bayElapsedSeconds % (BAY_OPEN_SECONDS + BAY_SEALED_SECONDS);
    return cycle < BAY_OPEN_SECONDS;
  }

  /** Drops the shield. Returns true the tick it first goes down. Bays start open. */
  expose(): boolean {
    if (!this.shielded) return false;
    this.shielded = false;
    this.bayElapsedSeconds = 0;
    return true;
  }

  /**
   * Open / sealed cycle. Combat only, so Recovering does not walk the doors (PRD 5.1).
   */
  advanceBays(tickSeconds: number): void {
    if (this.hull <= 0 || this.shielded) return;
    this.bayElapsedSeconds += tickSeconds;
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

  takeHit(damage = 1): boolean {
    if (this.hull <= 0 || this.shielded) return false;
    this.hull = Math.max(0, this.hull - damage);
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
      baysOpen: this.baysOpen,
    };
  }

  private pickLeg(random: RandomStream): void {
    const minX = this.homeX - RESURRECTION_SHIP_DRIFT_RANGE_UNITS;
    const maxX = Math.min(
      this.homeX + DRIFT_RIGHT_SLACK_UNITS,
      this.worldWidth - RESURRECTION_SHIP_HALF_WIDTH_UNITS - 4,
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
