/**
 * The Speech (PRD 8.3). Four seconds of hover and invulnerability. Recharge is jumps, not a timer.
 * ASSUMPTION: MVP has only this special, ready at launch; the loadout pick waits for a second special.
 */
export const SPEECH_DURATION_SECONDS = 4;
export const SPEECH_RECHARGE_JUMPS = 3;

export class Speech {
  private remainingSeconds = 0;
  private jumpsUntilReady = 0;

  get isActive(): boolean {
    return this.remainingSeconds > 0;
  }

  get isReady(): boolean {
    return this.jumpsUntilReady === 0 && this.remainingSeconds <= 0;
  }

  get remaining(): number {
    return this.remainingSeconds;
  }

  get jumpsUntilReadyCount(): number {
    return this.jumpsUntilReady;
  }

  /** Starts the speech. False when it is already running or still recharging. */
  tryStart(): boolean {
    if (!this.isReady) return false;
    this.remainingSeconds = SPEECH_DURATION_SECONDS;
    this.jumpsUntilReady = SPEECH_RECHARGE_JUMPS;
    return true;
  }

  /**
   * Counts down while active. Returns true the tick it ends. Ticks every simulation tick, including
   * jumping, so the four seconds are real combat-clock time (PRD 8.3: the jump clock keeps running).
   */
  advance(tickSeconds: number): boolean {
    if (this.remainingSeconds <= 0) return false;
    this.remainingSeconds = Math.max(0, this.remainingSeconds - tickSeconds);
    return this.remainingSeconds <= 0;
  }

  /** One jump toward recharge. Counts even if the speech is still talking. */
  onJump(): void {
    if (this.jumpsUntilReady <= 0) return;
    this.jumpsUntilReady -= 1;
  }
}
