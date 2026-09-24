import { RAIDER_FIRE_INTERVAL_SECONDS } from '../combat/projectile';
import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../shared/world';
import type { RaiderView } from '../views';
import { RETURNED_SPAWN_PROTECTION_SECONDS } from './resurrection';

/** First shot waits a beat so a spawn is not an instant beam in your face. */
const RAIDER_FIRST_SHOT_DELAY_SECONDS = 0.45;

/** Start HP. Three hits is long enough to read as a ship, short enough that a pass feels decisive. */
export const RAIDER_HIT_POINTS = 3;

/**
 * Slow enough that the Viper can intercept a column, fast enough that it does not hover. Was 55;
 * the first playtest with a full swarm found them a bit too fast (2026-09-24).
 */
export const RAIDER_SPEED_UNITS_PER_SECOND = 46;

export const RAIDER_HALF_WIDTH_UNITS = 7;
export const RAIDER_HALF_HEIGHT_UNITS = 6;

/**
 * Collision radius. Near the drawn box (half-width 7), a little generous so a grazing pass counts.
 * Two plays called 6 tight; this fairness pass widens it with the Viper hull, not alone (PRD 8.4).
 */
export const RAIDER_RADIUS_UNITS = 8;

export const RAIDER_SPAWN_Y_UNITS = RAIDER_HALF_HEIGHT_UNITS + 8;

/**
 * A weaving Raider's sway either side of its column, and the time for one full sway (ADR-0002 3.2).
 * Shallow and slow on purpose: a path you can read and cut across, never a zigzag (PRD 9, 15).
 */
export const SINE_AMPLITUDE_UNITS = 18;
export const SINE_PERIOD_SECONDS = 2.6;

/** How a Raider flies: straight down its column, or a shallow weave around it. */
export type FlightPattern = 'dive' | 'sine';

/**
 * A Raider, or a heavy Raider (PRD 18, ADR-0002 3.3): bigger, slower, harder to kill, and it never
 * downloads. It has its own queue and its own attack token; it does not dive the fleet.
 * ASSUMPTION: these numbers are the starting point agreed with the owner, tuned by the simulator.
 */
export type RaiderKind = 'raider' | 'heavy';

export const HEAVY_HIT_POINTS = 8;
export const HEAVY_SPEED_UNITS_PER_SECOND = 30;
export const HEAVY_RADIUS_UNITS = 12;
export const HEAVY_HALF_HEIGHT_UNITS = 9;

export function raiderSpawnMinX(fighterScale = 1): number {
  return RAIDER_HALF_WIDTH_UNITS * fighterScale;
}

export function raiderSpawnMaxX(worldWidth: number = WORLD_WIDTH_UNITS, fighterScale = 1): number {
  return worldWidth - RAIDER_HALF_WIDTH_UNITS * fighterScale;
}

/**
 * One Cylon Raider: an arrowhead flying down the world. Movement lives in the domain because
 * collision and (later) fleet damage read it.
 */
export class Raider {
  readonly id: number;
  /** Survives a destroy so the same soul can come back (PRD 6). */
  readonly identityId: number;
  readonly deaths: number;
  readonly returned: boolean;
  private positionX: number;
  private positionY: number;
  private previousPositionX: number;
  private previousPositionY: number;
  private hitPoints: number;
  private fireCooldownSeconds: number;
  private protectionRemainingSeconds: number;
  private armed = false;
  private strafing = false;
  /** The column a weave is centred on, and how far through the sway it is. */
  private readonly columnX: number;
  private swaySeconds = 0;
  readonly pattern: FlightPattern;
  readonly kind: RaiderKind;

  constructor(
    id: number,
    identityId: number,
    x: number,
    y: number,
    options: {
      readonly deaths?: number;
      readonly returned?: boolean;
      readonly pattern?: FlightPattern;
      readonly kind?: RaiderKind;
    } = {},
  ) {
    this.id = id;
    this.identityId = identityId;
    this.deaths = options.deaths ?? 0;
    this.returned = options.returned ?? false;
    this.pattern = options.pattern ?? 'dive';
    this.kind = options.kind ?? 'raider';
    this.columnX = x;
    this.positionX = x;
    this.positionY = y;
    this.previousPositionX = x;
    this.previousPositionY = y;
    this.hitPoints = this.kind === 'heavy' ? HEAVY_HIT_POINTS : RAIDER_HIT_POINTS;
    this.fireCooldownSeconds = RAIDER_FIRST_SHOT_DELAY_SECONDS;
    this.protectionRemainingSeconds = this.returned ? RETURNED_SPAWN_PROTECTION_SECONDS : 0;
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

  get isProtected(): boolean {
    return this.protectionRemainingSeconds > 0;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  get isStrafing(): boolean {
    return this.strafing;
  }

  /** The Director hands out attack tokens. Only an armed Raider may fire (PRD 9). */
  setArmed(armed: boolean): void {
    this.armed = armed;
  }

  /** The Director flags a dive on the fleet. Only a strafing Raider hurts hulls when it crosses. */
  setStrafing(strafing: boolean): void {
    this.strafing = strafing;
  }

  /**
   * Holds station: previous pose matches current, so the renderer does not interpolate a streak
   * while The Speech freezes the swarm (PRD 8.3).
   */
  holdStation(): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
  }

  advance(tickSeconds: number): void {
    this.previousPositionX = this.positionX;
    this.previousPositionY = this.positionY;
    this.positionY += (this.kind === 'heavy' ? HEAVY_SPEED_UNITS_PER_SECOND : RAIDER_SPEED_UNITS_PER_SECOND) * tickSeconds;
    if (this.pattern === 'sine') {
      this.swaySeconds += tickSeconds;
      this.positionX = this.columnX + SINE_AMPLITUDE_UNITS * Math.sin((2 * Math.PI * this.swaySeconds) / SINE_PERIOD_SECONDS);
    }
    this.fireCooldownSeconds -= tickSeconds;
    if (this.protectionRemainingSeconds > 0) {
      this.protectionRemainingSeconds = Math.max(0, this.protectionRemainingSeconds - tickSeconds);
    }
  }

  get readyToFire(): boolean {
    return this.fireCooldownSeconds <= 0;
  }

  spentShot(): void {
    this.fireCooldownSeconds = RAIDER_FIRE_INTERVAL_SECONDS;
  }

  /**
   * True when this Raider crossed the fleet line during the last advance (swept, not endpoint-only).
   */
  crossedFleetLine(lineY: number): boolean {
    return this.previousPositionY <= lineY && this.positionY > lineY;
  }

  /**
   * True when the Raider has flown past the bottom of the play area. Non-strafers wrap; strafers
   * hit the fleet first, then wrap.
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

  /** Removes hit points. Returns true when this hit destroyed it. */
  takeHit(damage = 1): boolean {
    if (this.hitPoints <= 0) return false;
    this.hitPoints = Math.max(0, this.hitPoints - damage);
    return this.hitPoints <= 0;
  }

  toView(): RaiderView {
    return {
      id: this.id,
      identityId: this.identityId,
      x: this.positionX,
      y: this.positionY,
      previousX: this.previousPositionX,
      previousY: this.previousPositionY,
      hp: this.hitPoints,
      hpMax: this.kind === 'heavy' ? HEAVY_HIT_POINTS : RAIDER_HIT_POINTS,
      kind: this.kind,
      deaths: this.deaths,
      returned: this.returned,
      protected: this.isProtected,
      armed: this.armed,
      strafing: this.strafing,
    };
  }
}
