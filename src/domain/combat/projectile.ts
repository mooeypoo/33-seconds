import type { ProjectileView } from '../views';

/**
 * Auto-fire is always on and never tracks a target (PRD 8.1, decision 13): shots travel toward the
 * swarm side, which is up in this world.
 */
export const VIPER_FIRE_INTERVAL_SECONDS = 0.2;

/** Fast enough to feel like a gun, slow enough that the player can see the round. */
export const VIPER_SHOT_SPEED_UNITS_PER_SECOND = 420;

export const VIPER_SHOT_RADIUS_UNITS = 2;

/** Visual size of the placeholder round, in world units. */
export const VIPER_SHOT_WIDTH_UNITS = 3;
export const VIPER_SHOT_HEIGHT_UNITS = 5;

/**
 * A hard cap so a long run cannot allocate forever (ADR-0001 D13). At five shots a second and this
 * speed, only a handful are live; the rest of the array is recycled.
 */
export const MAX_PLAYER_SHOTS = 12;

/**
 * A player round. Recycled in place: `revive` hands it a new id and pose, `kill` takes it out of
 * the live set without freeing the object.
 */
export class Projectile {
  private idValue = 0;
  private positionX = 0;
  private positionY = 0;
  private previousPositionX = 0;
  private previousPositionY = 0;
  private velocityX = 0;
  private velocityY = 0;
  private live = false;

  get id(): number {
    return this.idValue;
  }

  get alive(): boolean {
    return this.live;
  }

  revive(id: number, x: number, y: number, velocityX: number, velocityY: number): void {
    this.idValue = id;
    this.positionX = x;
    this.positionY = y;
    this.previousPositionX = x;
    this.previousPositionY = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.live = true;
  }

  kill(): void {
    this.live = false;
  }

  advance(tickSeconds: number): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.positionX += this.velocityX * tickSeconds;
    this.positionY += this.velocityY * tickSeconds;
  }

  /** Off the top of the world, with a little slack so the sprite is gone before we recycle it. */
  get hasLeftTheWorld(): boolean {
    return this.positionY < -VIPER_SHOT_HEIGHT_UNITS;
  }

  toView(): ProjectileView {
    return {
      id: this.idValue,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
    };
  }
}
