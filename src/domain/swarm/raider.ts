import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { RaiderView } from '../views';

/** Start HP. Three hits is long enough to read as a ship, short enough that a pass feels decisive. */
export const RAIDER_HIT_POINTS = 3;

/** Slow enough that the Viper can intercept a column, fast enough that it does not hover. */
export const RAIDER_SPEED_UNITS_PER_SECOND = 55;

export const RAIDER_HALF_WIDTH_UNITS = 7;
export const RAIDER_HALF_HEIGHT_UNITS = 6;

/**
 * Collision radius. Slightly smaller than the drawn box, so a near-miss looks like a near-miss.
 * First play on a desktop phone-view found this tight. Leave it: we cannot tell a real miss from a
 * phone-view scaling quirk until there are more things to shoot at (PRD 8.4).
 */
export const RAIDER_RADIUS_UNITS = 6;

export const RAIDER_SPAWN_Y_UNITS = RAIDER_HALF_HEIGHT_UNITS + 8;

/**
 * After a kill, wait this long before the next one appears. This is not resurrection: there is no
 * ghost, no download, and no Returned marker. Those arrive in M2. The delay is only so a kill is
 * visible before the next flyby starts.
 */
export const RAIDER_RESPAWN_SECONDS = 1.2;

export function raiderSpawnMinX(): number {
  return RAIDER_HALF_WIDTH_UNITS;
}

export function raiderSpawnMaxX(): number {
  return WORLD_WIDTH_UNITS - RAIDER_HALF_WIDTH_UNITS;
}

/**
 * One Cylon Raider: an arrowhead flying down the world. Movement lives in the domain because
 * collision and (later) fleet damage read it.
 */
export class Raider {
  readonly id: number;
  private positionX: number;
  private positionY: number;
  private previousPositionX: number;
  private previousPositionY: number;
  private hitPoints: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.positionX = x;
    this.positionY = y;
    this.previousPositionX = x;
    this.previousPositionY = y;
    this.hitPoints = RAIDER_HIT_POINTS;
  }

  get x(): number {
    return this.positionX;
  }

  get y(): number {
    return this.positionY;
  }

  get hp(): number {
    return this.hitPoints;
  }

  advance(tickSeconds: number): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.positionY += RAIDER_SPEED_UNITS_PER_SECOND * tickSeconds;
  }

  /**
   * True when the Raider has flown past the bottom of the play area. Until fleet damage exists,
   * the game sends it back to the top rather than letting it vanish.
   */
  get hasLeftTheBottom(): boolean {
    return this.positionY > WORLD_HEIGHT_UNITS + RAIDER_HALF_HEIGHT_UNITS;
  }

  /**
   * Pops back to the top of the same column. Previous pose matches, so the renderer does not draw
   * a streak from the bottom to the top in the interpolation frame.
   */
  reappearAtTop(): void {
    this.positionY = RAIDER_SPAWN_Y_UNITS;
    this.previousPositionY = RAIDER_SPAWN_Y_UNITS;
    this.previousPositionX = this.positionX;
  }

  /** Removes one hit point. Returns true when this hit destroyed it. */
  takeHit(): boolean {
    if (this.hitPoints <= 0) return false;
    this.hitPoints -= 1;
    return this.hitPoints <= 0;
  }

  toView(): RaiderView {
    return {
      id: this.id,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      hp: this.hitPoints,
    };
  }
}
