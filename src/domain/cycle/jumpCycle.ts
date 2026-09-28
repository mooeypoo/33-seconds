import { TICKS_PER_SECOND } from '../shared/time';

/**
 * The 33-second combat clock is the game's identity (PRD 5.1). Difficulty may change everything
 * around it. These numbers are not tunables. They are stored in ticks so 33 seconds is exact,
 * rather than 33 / (1/60) of a float.
 */
export const CYCLE_COMBAT_SECONDS = 33;
export const ARRIVING_SECONDS = 5;
export const SPOOLING_START_SECONDS = 25;
export const JUMPING_SECONDS = 1;
/** The spool is the last 8 seconds of any cycle, so its tell and its comms calls mean the same. */
export const SPOOL_SECONDS = CYCLE_COMBAT_SECONDS - SPOOLING_START_SECONDS;

/**
 * The only cycle lengths there are. 66 is the Slow FTL challenge's, the one exception to 5.1
 * (PRD 11.1, ADR-0004). A union, not a number, so the clock never becomes a tuning knob.
 */
export type CycleSeconds = typeof CYCLE_COMBAT_SECONDS | 66;

export const ARRIVING_TICKS = ARRIVING_SECONDS * TICKS_PER_SECOND;
export const JUMPING_TICKS = JUMPING_SECONDS * TICKS_PER_SECOND;

export type CyclePhase = 'arriving' | 'building' | 'spooling' | 'jumping' | 'recovering';


/**
 * The jump cycle. Combat time accumulates only in arriving / building / spooling. Jumping lasts a
 * fixed second. Recovering does not advance on its own: the next cycle starts when the player
 * continues. The pick is that continue (PRD 5.1: no timer on the pick). The session holds the
 * pick until the Recovering scene has finished.
 */
export class JumpCycle {
  private readonly combatTicks: number;
  private readonly spoolStartTicks: number;
  private phase: CyclePhase = 'arriving';
  private cycleIndex = 1;
  private combatElapsedTicks = 0;
  private jumpingElapsedTicks = 0;

  constructor(private readonly combatSeconds: CycleSeconds = CYCLE_COMBAT_SECONDS) {
    this.combatTicks = combatSeconds * TICKS_PER_SECOND;
    this.spoolStartTicks = (combatSeconds - SPOOL_SECONDS) * TICKS_PER_SECOND;
  }

  get view(): {
    readonly phase: CyclePhase;
    readonly cycleIndex: number;
    /** 33, or 66 for Slow FTL. The HUD's bar fills across it. */
    readonly combatSeconds: CycleSeconds;
    readonly combatElapsedSeconds: number;
    readonly secondsRemaining: number;
    readonly spoolProgress: number;
  } {
    const remainingTicks = Math.max(0, this.combatTicks - this.combatElapsedTicks);
    const spoolingTicks = this.combatElapsedTicks - this.spoolStartTicks;
    const spoolLength = this.combatTicks - this.spoolStartTicks;
    let spoolProgress = 0;
    if (this.phase === 'spooling') {
      spoolProgress = Math.min(1, Math.max(0, spoolingTicks / spoolLength));
    } else if (this.phase === 'jumping' || this.phase === 'recovering') {
      spoolProgress = 1;
    }

    return {
      phase: this.phase,
      cycleIndex: this.cycleIndex,
      combatSeconds: this.combatSeconds,
      combatElapsedSeconds: this.combatElapsedTicks / TICKS_PER_SECOND,
      secondsRemaining: this.phase === 'jumping' || this.phase === 'recovering' ? 0 : Math.ceil(remainingTicks / TICKS_PER_SECOND),
      spoolProgress,
    };
  }

  get isInCombat(): boolean {
    return this.phase === 'arriving' || this.phase === 'building' || this.phase === 'spooling';
  }

  get isRecovering(): boolean {
    return this.phase === 'recovering';
  }

  get isJumping(): boolean {
    return this.phase === 'jumping';
  }

  /** First-tick announcement, so presenters and the HUD learn the run has begun. */
  begin(): { type: 'CyclePhaseChanged'; phase: CyclePhase; cycleIndex: number } {
    return { type: 'CyclePhaseChanged', phase: 'arriving', cycleIndex: this.cycleIndex };
  }

  advance(_tickSeconds: number): { type: 'CyclePhaseChanged'; phase: CyclePhase; cycleIndex: number } | null {
    if (this.phase === 'recovering') return null;

    if (this.phase === 'jumping') {
      this.jumpingElapsedTicks += 1;
      if (this.jumpingElapsedTicks < JUMPING_TICKS) return null;
      this.phase = 'recovering';
      this.jumpingElapsedTicks = 0;
      return { type: 'CyclePhaseChanged', phase: 'recovering', cycleIndex: this.cycleIndex };
    }

    const previous = this.phase;
    this.combatElapsedTicks += 1;

    if (this.combatElapsedTicks >= this.combatTicks) {
      this.combatElapsedTicks = this.combatTicks;
      this.phase = 'jumping';
      this.jumpingElapsedTicks = 0;
      return { type: 'CyclePhaseChanged', phase: 'jumping', cycleIndex: this.cycleIndex };
    }

    this.phase = this.phaseAt(this.combatElapsedTicks);
    if (this.phase === previous) return null;
    return { type: 'CyclePhaseChanged', phase: this.phase, cycleIndex: this.cycleIndex };
  }

  private phaseAt(tick: number): Exclude<CyclePhase, 'jumping' | 'recovering'> {
    if (tick < ARRIVING_TICKS) return 'arriving';
    if (tick < this.spoolStartTicks) return 'building';
    return 'spooling';
  }

  /**
   * Leaves Recovering for the next arriving. Ignored unless we are recovering, so a double-tap on
   * Continue cannot skip a cycle.
   */
  continueFromJump(): { type: 'CyclePhaseChanged'; phase: CyclePhase; cycleIndex: number } | null {
    if (this.phase !== 'recovering') return null;
    this.cycleIndex += 1;
    this.combatElapsedTicks = 0;
    this.jumpingElapsedTicks = 0;
    this.phase = 'arriving';
    return { type: 'CyclePhaseChanged', phase: 'arriving', cycleIndex: this.cycleIndex };
  }
}
