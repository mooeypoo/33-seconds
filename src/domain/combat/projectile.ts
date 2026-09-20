import type { ProjectileOwner, ProjectileView } from '../views';
import { WORLD_HEIGHT_UNITS } from '../shared/world';

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
export const MAX_CYLON_SHOTS = 16;

/** Slower than the Viper's gun, so a shot can be seen and slipped. */
export const RAIDER_FIRE_INTERVAL_SECONDS = 0.7;
export const RAIDER_SHOT_SPEED_UNITS_PER_SECOND = 200;
export const RAIDER_SHOT_RADIUS_UNITS = 2;

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
  private ownerValue: ProjectileOwner = 'player';
  private stray = false;
  private live = false;

  get id(): number {
    return this.idValue;
  }

  get alive(): boolean {
    return this.live;
  }

  get owner(): ProjectileOwner {
    return this.ownerValue;
  }

  revive(
    id: number,
    x: number,
    y: number,
    velocityX: number,
    velocityY: number,
    owner: ProjectileOwner = 'player',
  ): void {
    this.idValue = id;
    this.positionX = x;
    this.positionY = y;
    this.previousPositionX = x;
    this.previousPositionY = y;
    this.velocityX = velocityX;
    this.velocityY = velocityY;
    this.ownerValue = owner;
    this.stray = false;
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

  /** Off the top or bottom of the world, with a little slack so the sprite is gone first. */
  get hasLeftTheWorld(): boolean {
    return this.positionY < -VIPER_SHOT_HEIGHT_UNITS || this.positionY > WORLD_HEIGHT_UNITS + VIPER_SHOT_HEIGHT_UNITS;
  }

  /**
   * A Cylon round becomes Stray once it has passed the Viper (PRD 7.1). The tell is orange before
   * the round reaches the fleet line.
   */
  becomeStrayIfPast(viperY: number): void {
    if (this.ownerValue === 'cylon' && this.positionY > viperY) this.stray = true;
  }

  /** True when this stray crossed the fleet line during the last advance (swept, not endpoint-only). */
  crossedFleetLine(lineY: number): boolean {
    return this.live && this.stray && this.previousPositionY <= lineY && this.positionY > lineY;
  }

  toView(): ProjectileView {
    return {
      id: this.idValue,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      owner: this.ownerValue,
      stray: this.stray,
    };
  }
}
