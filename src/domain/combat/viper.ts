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

  /**
   * Advances one tick towards the requested direction.
   *
   * @param moveX -1..1, negative is left
   * @param moveY -1..1, negative is up
   * @param tickSeconds length of one tick
   */
  steer(moveX: number, moveY: number, tickSeconds: number): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;

    const direction = clampIntentDirection(moveX, moveY);
    const targetVelocityX = direction.x * VIPER_MAX_SPEED_UNITS_PER_SECOND;
    const targetVelocityY = direction.y * VIPER_MAX_SPEED_UNITS_PER_SECOND;
    const maxVelocityChange = VIPER_ACCELERATION_UNITS_PER_SECOND_SQUARED * tickSeconds;

    this.velocityX = approach(this.velocityX, targetVelocityX, maxVelocityChange);
    this.velocityY = approach(this.velocityY, targetVelocityY, maxVelocityChange);

    this.positionX += this.velocityX * tickSeconds;
    this.positionY += this.velocityY * tickSeconds;

    this.clampIntoWorld();
  }

  /**
   * Keeps the whole ship inside the play area. Hitting an edge also drops the velocity along that
   * axis, so holding into a wall does not build up momentum that fires the Viper away on release.
   */
  private clampIntoWorld(): void {
    const minX = VIPER_HALF_WIDTH_UNITS;
    const maxX = WORLD_WIDTH_UNITS - VIPER_HALF_WIDTH_UNITS;
    const minY = VIPER_HALF_HEIGHT_UNITS;
    const maxY = WORLD_HEIGHT_UNITS - VIPER_HALF_HEIGHT_UNITS;

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
