import { RAIDER_HIT_POINTS } from '../swarm/raider';
import { WORLD_HEIGHT_UNITS } from '../shared/world';
import type { MissileView } from '../views';

/** Three per cycle, refilled at the jump (PRD 8.2). */
export const MISSILE_CAPACITY = 3;

/**
 * Fast enough to read as a committed shot, slow enough that an escort can still soak it.
 * ASSUMPTION: 280 wu/s until play says the lock-to-impact wait is too long or too snappy.
 */
export const MISSILE_SPEED_UNITS_PER_SECOND = 280;

export const MISSILE_RADIUS_UNITS = 4;

/** Placeholder size, matching the art list. */
export const MISSILE_WIDTH_UNITS = 5;
export const MISSILE_HEIGHT_UNITS = 9;

/** A missile one-shots a Raider (PRD 8.2: it explodes). */
export const MISSILE_RAIDER_DAMAGE = RAIDER_HIT_POINTS;

/**
 * A chunk of the resurrection ship, not a one-shot. Three missiles are 24 of 60 if they all land.
 * ASSUMPTION: 8 until the fairness pass; the gun is still the main chip.
 */
export const MISSILE_SHIP_DAMAGE = 8;

/** Stable id so lock ties with Raiders break deterministically. Raider ids start at 1. */
export const RESURRECTION_SHIP_LOCK_ID = 0;

export const MAX_MISSILES = MISSILE_CAPACITY;

/**
 * A player missile. Recycled in place like gun rounds. Homes on a lock, or flies straight up
 * when there is none.
 */
export class Missile {
  private idValue = 0;
  private positionX = 0;
  private positionY = 0;
  private previousPositionX = 0;
  private previousPositionY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private targetIdValue: number | null = null;
  private live = false;
  private speed = MISSILE_SPEED_UNITS_PER_SECOND;

  get id(): number {
    return this.idValue;
  }

  get alive(): boolean {
    return this.live;
  }

  get targetId(): number | null {
    return this.targetIdValue;
  }

  revive(
    id: number,
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    targetId: number | null,
  ): void {
    this.idValue = id;
    this.positionX = x;
    this.positionY = y;
    this.previousPositionX = x;
    this.previousPositionY = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.targetIdValue = targetId;
    this.live = true;
    this.speed = Math.hypot(velocityX, velocityY) || MISSILE_SPEED_UNITS_PER_SECOND;
  }

  kill(): void {
    this.live = false;
  }

  /**
   * Flies one tick. When a live target pose is passed, the velocity turns to face it (perfect
   * home, no turn cap). Escorts still soak because hits resolve along the path, not the lock.
   */
  advance(tickSeconds: number, targetX?: number, targetY?: number): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    if (targetX !== undefined && targetY !== undefined) {
      const deltaX = targetX - this.positionX;
      const deltaY = targetY - this.positionY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > 0) {
        this.velocityX = (deltaX / distance) * this.speed;
        this.velocityY = (deltaY / distance) * this.speed;
      }
    }
    this.positionX += this.velocityX * tickSeconds;
    this.positionY += this.velocityY * tickSeconds;
  }

  get hasLeftTheWorld(): boolean {
    return (
      this.positionY < -MISSILE_HEIGHT_UNITS || this.positionY > WORLD_HEIGHT_UNITS + MISSILE_HEIGHT_UNITS
    );
  }

  toView(): MissileView {
    return {
      id: this.idValue,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
    };
  }
}
