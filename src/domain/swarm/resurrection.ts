/**
 * Resurrection refills the Director's concurrent-Raider cap. It does not add bodies (PRD 6, 9).
 * Two bodies so a kill is a dip, not an empty sky, and a return is visibly a refill.
 */
export const DIRECTOR_CAP = 2;

/**
 * How many live Raiders may shoot at once (PRD 9). The rest fly but hold fire. Starts at 1 so
 * two bodies do not double the incoming fire before the fairness pass.
 */
export const ATTACK_TOKENS = 1;

/**
 * How many live Raiders may dive the fleet at once (PRD 7.1). Starts at 1 so one body shoots and
 * the other is the run you can intercept.
 */
export const STRAFE_TOKENS = 1;

/** Base download time before a destroyed Raider returns (PRD 6). Tunable per tier later. */
export const RESURRECTION_DOWNLOAD_SECONDS = 6;

/** Returned Raiders cannot be hurt for this long after they appear (PRD 6.1). */
export const RETURNED_SPAWN_PROTECTION_SECONDS = 1.5;

/**
 * *Spoilers* hitbox. Near a Raider so the spawn marker is not fiddly. ASSUMPTION: 8 wu until play
 * says the top-of-column blip is too generous.
 */
export const GHOST_RADIUS_UNITS = 8;

/**
 * One soul in the download queue. The timer only moves while the cycle is in combat. A jump
 * marks every pending download ready, so they arrive first in the next Arriving (PRD 5.1, 6).
 */
export class Download {
  readonly identityId: number;
  readonly deaths: number;
  readonly x: number;
  readonly y: number;
  private remainingSeconds: number;
  /** The whole wait, including *Spoilers* delays, so the bar fills at the pace of this download. */
  private totalSeconds: number;

  constructor(
    identityId: number,
    deaths: number,
    x: number,
    y: number,
    durationSeconds = RESURRECTION_DOWNLOAD_SECONDS,
  ) {
    this.identityId = identityId;
    this.deaths = deaths;
    this.x = x;
    this.y = y;
    this.remainingSeconds = durationSeconds;
    this.totalSeconds = durationSeconds;
  }

  advance(tickSeconds: number): void {
    this.remainingSeconds -= tickSeconds;
  }

  get isReady(): boolean {
    return this.remainingSeconds <= 0;
  }

  /** Pending downloads finish in transit and arrive first after the jump. */
  arriveNow(): void {
    this.remainingSeconds = 0;
  }

  /** *Spoilers*: a hit pushes the queue back. Jump still finishes transit (PRD 6). */
  delay(seconds: number): void {
    this.remainingSeconds += seconds;
    this.totalSeconds += seconds;
  }

  get remaining(): number {
    return Math.max(0, this.remainingSeconds);
  }

  /** 0 at the kill, 1 when ready. A delay moves it back, so the rewind is visible. */
  get progress(): number {
    if (this.totalSeconds <= 0) return 1;
    return Math.min(1, Math.max(0, 1 - this.remaining / this.totalSeconds));
  }
}
