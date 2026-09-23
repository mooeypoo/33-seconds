import { MISSILE_CAPACITY } from './missile';
import { clampIntentDirection } from '../shared/intent';
import { clamp, WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';

/** Top speed the Viper can reach, in world units per second. Crossing the world takes about 3 s. */
export const VIPER_MAX_SPEED_UNITS_PER_SECOND = 92;

/**
 * How fast the Viper approaches the speed the player asked for, in units per second squared.
 * High enough to feel responsive, low enough to read as a ship with mass rather than a cursor.
 * The same figure slows it down, so letting go coasts briefly instead of stopping dead.
 */
export const VIPER_ACCELERATION_UNITS_PER_SECOND_SQUARED = 520;

/** Half the Viper's collision box, in world units. Used to keep it fully inside the play area. */
export const VIPER_HALF_WIDTH_UNITS = 6;
export const VIPER_HALF_HEIGHT_UNITS = 7;

/** Where the Viper starts: centred horizontally, low enough to sit in front of the fleet. */
export const VIPER_SPAWN_X_UNITS = WORLD_WIDTH_UNITS / 2;
export const VIPER_SPAWN_Y_UNITS = WORLD_HEIGHT_UNITS * 0.78;

/** Five hits outlasts one Raider's 3 HP (PRD 8.1). Reset at each jump. */
export const VIPER_HULL_HIT_POINTS = 5;

/** Collision radius. Close to the drawn hull, a little generous so a grazing Cylon round counts. */
export const VIPER_RADIUS_UNITS = 6;

/** Downtime after a destroy. Costs time, never the run (PRD 8.1). */
export const VIPER_EJECT_SECONDS = 3;

/**
 * Brief cover after pickup so a round that was already in the cockpit is not an instant second
 * eject. Not the *Anyone Could Be a Cylon* card; that one is longer and cosmetic.
 */
export const VIPER_PICKUP_INVULN_SECONDS = 0.6;

/**
 * The player's Viper: position and velocity in world units, mutated only through `steer`.
 * Movement lives in the domain because rules read it (ADR-0001 D4).
 */
export class Viper {
  private positionX = VIPER_SPAWN_X_UNITS;
  private positionY = VIPER_SPAWN_Y_UNITS;
  private velocityX = 0;
  private velocityY = 0;

  /** Position at the end of the previous tick, so the renderer can interpolate (ADR-0001 D2). */
  private previousPositionX = VIPER_SPAWN_X_UNITS;
  private previousPositionY = VIPER_SPAWN_Y_UNITS;
  private hull = VIPER_HULL_HIT_POINTS;
  /** Hits since the last jump, including ones a download put back. The scene reads this. */
  private hullLostSinceJump = 0;
  private ejectedSinceJump = false;
  private lastHullLost = 0;
  private lastEjected = false;
  private missiles = MISSILE_CAPACITY;
  private ejected = false;
  private ejectRemainingSeconds = 0;
  private invulnerableRemainingSeconds = 0;

  get x(): number {
    return this.positionX;
  }

  get y(): number {
    return this.positionY;
  }

  get velocityXUnitsPerSecond(): number {
    return this.velocityX;
  }

  get velocityYUnitsPerSecond(): number {
    return this.velocityY;
  }

  get previousX(): number {
    return this.previousPositionX;
  }

  get previousY(): number {
    return this.previousPositionY;
  }

  get hp(): number {
    return this.hull;
  }

  get missileAmmo(): number {
    return this.missiles;
  }

  /** Spends one missile. False when the rack is empty. */
  trySpendMissile(): boolean {
    if (this.missiles <= 0) return false;
    this.missiles -= 1;
    return true;
  }

  get isEjected(): boolean {
    return this.ejected;
  }

  /** Hull lost in the cycle that just jumped. Still set after `resetAtJump`. */
  get scarHullLost(): number {
    return this.lastHullLost;
  }

  /** True if this cycle ejected the pilot, even when a download put them back. */
  get scarEjected(): boolean {
    return this.lastEjected;
  }

  get canFight(): boolean {
    return !this.ejected;
  }

  get isVulnerable(): boolean {
    return !this.ejected && this.invulnerableRemainingSeconds <= 0;
  }

  /**
   * Advances one tick towards the requested direction.
   *
   * @param moveX -1..1, negative is left
   * @param moveY -1..1, negative is up
   * @param tickSeconds length of one tick
   * @param maxSpeedUnitsPerSecond top speed after cards (Bootleg Hooch)
   * @param sizeScale hull scale after cards (Accidentally Wide)
   */
  steer(
    moveX: number,
    moveY: number,
    tickSeconds: number,
    maxSpeedUnitsPerSecond = VIPER_MAX_SPEED_UNITS_PER_SECOND,
    sizeScale = 1,
  ): void {
    if (this.invulnerableRemainingSeconds > 0) {
      this.invulnerableRemainingSeconds = Math.max(0, this.invulnerableRemainingSeconds - tickSeconds);
    }

    if (this.ejected) {
      this.previousPositionX = this.positionX;
      this.previousPositionY = this.positionY;
      this.ejectRemainingSeconds -= tickSeconds;
      return;
    }

    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;

    const direction = clampIntentDirection(moveX, moveY);
    const targetVelocityX = direction.x * maxSpeedUnitsPerSecond;
    const targetVelocityY = direction.y * maxSpeedUnitsPerSecond;
    const maxVelocityChange = VIPER_ACCELERATION_UNITS_PER_SECOND_SQUARED * tickSeconds;

    this.velocityX = approach(this.velocityX, targetVelocityX, maxVelocityChange);
    this.velocityY = approach(this.velocityY, targetVelocityY, maxVelocityChange);

    this.positionX += this.velocityX * tickSeconds;
    this.positionY += this.velocityY * tickSeconds;

    this.clampIntoWorld(sizeScale);
  }

  /** Removes one hull point. Returns true when this hit ejected the pilot. */
  takeHit(): boolean {
    if (!this.isVulnerable) return false;
    this.hull -= 1;
    this.hullLostSinceJump += 1;
    if (this.hull > 0) return false;
    this.ejected = true;
    this.ejectedSinceJump = true;
    this.ejectRemainingSeconds = VIPER_EJECT_SECONDS;
    this.velocityX = 0;
    this.velocityY = 0;
    return true;
  }

  /** True when downtime is over and the pickup should put a Viper back in the fight. */
  get isReadyForPickup(): boolean {
    return this.ejected && this.ejectRemainingSeconds <= 0;
  }

  /**
   * *Anyone Could Be a Cylon*: undo a lethal hit in place, full hull, longer cover. The red-eye
   * flag lives on the loadout, not here.
   */
  absorbDownload(invulnerableSeconds: number): void {
    this.ejected = false;
    this.ejectRemainingSeconds = 0;
    this.hull = VIPER_HULL_HIT_POINTS;
    this.invulnerableRemainingSeconds = invulnerableSeconds;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /** Puts a fresh Viper at the spawn, with a short cover so the next shot is not free. */
  recoverFromEject(): void {
    this.ejected = false;
    this.ejectRemainingSeconds = 0;
    this.hull = VIPER_HULL_HIT_POINTS;
    this.invulnerableRemainingSeconds = VIPER_PICKUP_INVULN_SECONDS;
    this.positionX = VIPER_SPAWN_X_UNITS;
    this.positionY = VIPER_SPAWN_Y_UNITS;
    this.previousPositionX = VIPER_SPAWN_X_UNITS;
    this.previousPositionY = VIPER_SPAWN_Y_UNITS;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /** Tyrol at the jump: full hull and a fresh rack of missiles, and a pilot in a Raptor is back. */
  resetAtJump(): void {
    this.lastHullLost = this.hullLostSinceJump;
    this.lastEjected = this.ejectedSinceJump;
    this.hullLostSinceJump = 0;
    this.ejectedSinceJump = false;
    this.ejected = false;
    this.ejectRemainingSeconds = 0;
    this.hull = VIPER_HULL_HIT_POINTS;
    this.missiles = MISSILE_CAPACITY;
    this.invulnerableRemainingSeconds = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  /**
   * Keeps the whole ship inside the play area. Hitting an edge also drops the velocity along that
   * axis, so holding into a wall does not build up momentum that fires the Viper away on release.
   */
  private clampIntoWorld(sizeScale = 1): void {
    const halfWidth = VIPER_HALF_WIDTH_UNITS * sizeScale;
    const halfHeight = VIPER_HALF_HEIGHT_UNITS * sizeScale;
    const minX = halfWidth;
    const maxX = WORLD_WIDTH_UNITS - halfWidth;
    const minY = halfHeight;
    const maxY = WORLD_HEIGHT_UNITS - halfHeight;

    const clampedX = clamp(this.positionX, minX, maxX);
    const clampedY = clamp(this.positionY, minY, maxY);

    if (clampedX !== this.positionX) {
      this.positionX = clampedX;
      this.velocityX = 0;
    }
    if (clampedY !== this.positionY) {
      this.positionY = clampedY;
      this.velocityY = 0;
    }
  }
}

/** Moves `current` towards `target` by at most `maxChange`. */
function approach(current: number, target: number, maxChange: number): number {
  const difference = target - current;
  if (Math.abs(difference) <= maxChange) return target;
  return current + Math.sign(difference) * maxChange;
}
