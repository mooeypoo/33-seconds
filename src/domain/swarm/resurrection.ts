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

/** Base download time before a destroyed Raider returns (PRD 6). Tunable per tier later. */
export const RESURRECTION_DOWNLOAD_SECONDS = 6;

/** Returned Raiders cannot be hurt for this long after they appear (PRD 6.1). */
export const RETURNED_SPAWN_PROTECTION_SECONDS = 1.5;

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

  constructor(identityId: number, deaths: number, x: number, y: number) {
    this.identityId = identityId;
    this.deaths = deaths;
    this.x = x;
    this.y = y;
    this.remainingSeconds = RESURRECTION_DOWNLOAD_SECONDS;
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

  get remaining(): number {
    return Math.max(0, this.remainingSeconds);
  }
}
