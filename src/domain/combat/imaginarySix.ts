import { VIPER_FIRE_INTERVAL_SECONDS } from './projectile';
import { clamp, WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { ImaginarySixView } from '../views';

/** Half a gun hit. ASSUMPTION: same interval as the Viper until play (PRD 10.3). */
export const SIX_DAMAGE = 0.5;

export const SIX_FIRE_INTERVAL_SECONDS = VIPER_FIRE_INTERVAL_SECONDS;

/**
 * How far the beam reaches. ASSUMPTION: 140 wu so she is overwatch beside you, not a map-wide
 * delete of every strafe (PRD 10.3 balance watch).
 */
export const SIX_RANGE_UNITS = 140;

/**
 * Starboard of the Viper, unless that would leave the world. Her picture's half width (8) plus the
 * Viper's drawn half width (15) and a small gap, so the two never overlap.
 */
export const SIX_OFFSET_X_UNITS = 26;

/** Her drawn size, 16 x 24 units, so the world-edge clamp keeps the whole picture on screen. */
export const SIX_HALF_WIDTH_UNITS = 8;
export const SIX_HALF_HEIGHT_UNITS = 12;

/**
 * A wingman only the player can see. Formation, beam, no hull. She cannot be hit and does not
 * soak (PRD 10.3).
 */
export class ImaginarySix {
  private positionX = 0;
  private positionY = 0;
  private previousPositionX = 0;
  private previousPositionY = 0;
  private visible = false;
  private cooldownSeconds = 0;
  private beamX = 0;
  private beamY = 0;
  private aiming = false;
  private readonly worldWidth: number;

  constructor(worldWidth: number = WORLD_WIDTH_UNITS) {
    this.worldWidth = worldWidth;
  }

  get x(): number {
    return this.positionX;
  }

  get y(): number {
    return this.positionY;
  }

  get isPresent(): boolean {
    return this.visible;
  }

  get readyToFire(): boolean {
    return this.visible && this.cooldownSeconds <= 0;
  }

  get hasAim(): boolean {
    return this.visible && this.aiming;
  }

  follow(viperX: number, viperY: number, ejected: boolean): void {
    if (ejected) {
      this.previousPositionX = this.positionX;
      this.previousPositionY = this.positionY;
      this.visible = false;
      this.aiming = false;
      return;
    }

    const right = viperX + SIX_OFFSET_X_UNITS;
    const left = viperX - SIX_OFFSET_X_UNITS;
    const nextX = clamp(
      right <= this.worldWidth - SIX_HALF_WIDTH_UNITS ? right : left,
      SIX_HALF_WIDTH_UNITS,
      this.worldWidth - SIX_HALF_WIDTH_UNITS,
    );
    const nextY = clamp(viperY, SIX_HALF_HEIGHT_UNITS, WORLD_HEIGHT_UNITS - SIX_HALF_HEIGHT_UNITS);

    if (!this.visible) {
      this.positionX = nextX;
      this.positionY = nextY;
      this.previousPositionX = nextX;
      this.previousPositionY = nextY;
      this.visible = true;
      return;
    }

    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.positionX = nextX;
    this.positionY = nextY;
  }

  advance(tickSeconds: number): void {
    if (this.cooldownSeconds > 0) this.cooldownSeconds -= tickSeconds;
  }

  pointAt(x: number, y: number): void {
    this.beamX = x;
    this.beamY = y;
    this.aiming = this.visible;
  }

  clearAim(): void {
    this.aiming = false;
  }

  spentShot(): void {
    this.cooldownSeconds = SIX_FIRE_INTERVAL_SECONDS;
  }

  inRange(x: number, y: number): boolean {
    return this.visible && Math.hypot(this.positionX - x, this.positionY - y) <= SIX_RANGE_UNITS;
  }

  toView(): ImaginarySixView {
    return {
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      present: this.visible,
      aiming: this.aiming,
      beamX: this.beamX,
      beamY: this.beamY,
    };
  }
}
