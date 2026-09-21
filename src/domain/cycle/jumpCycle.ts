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

export const CYCLE_COMBAT_TICKS = CYCLE_COMBAT_SECONDS * TICKS_PER_SECOND;
export const ARRIVING_TICKS = ARRIVING_SECONDS * TICKS_PER_SECOND;
export const SPOOLING_START_TICKS = SPOOLING_START_SECONDS * TICKS_PER_SECOND;
export const JUMPING_TICKS = JUMPING_SECONDS * TICKS_PER_SECOND;

export type CyclePhase = 'arriving' | 'building' | 'spooling' | 'jumping' | 'recovering';

export function phaseAtCombatTick(tick: number): Exclude<CyclePhase, 'jumping' | 'recovering'> {
  if (tick < ARRIVING_TICKS) return 'arriving';
  if (tick < SPOOLING_START_TICKS) return 'building';
  return 'spooling';
}

/**
 * The jump cycle. Combat time accumulates only in arriving / building / spooling. Jumping lasts a
 * fixed second. Recovering does not advance on its own: the next cycle starts when the player
 * continues. The pick is that continue (PRD 5.1: no timer on the pick). The 8-12 s comms scene
 * arrives with M5.
 */
export class JumpCycle {
  private phase: CyclePhase = 'arriving';
  private cycleIndex = 1;
  private combatElapsedTicks = 0;
  private jumpingElapsedTicks = 0;

  get view(): {
    readonly phase: CyclePhase;
    readonly cycleIndex: number;
    readonly combatElapsedSeconds: number;
    readonly secondsRemaining: number;
    readonly spoolProgress: number;
  } {
    const remainingTicks = Math.max(0, CYCLE_COMBAT_TICKS - this.combatElapsedTicks);
    const spoolingTicks = this.combatElapsedTicks - SPOOLING_START_TICKS;
    const spoolLength = CYCLE_COMBAT_TICKS - SPOOLING_START_TICKS;
    let spoolProgress = 0;
    if (this.phase === 'spooling') {
      spoolProgress = Math.min(1, Math.max(0, spoolingTicks / spoolLength));
    } else if (this.phase === 'jumping' || this.phase === 'recovering') {
      spoolProgress = 1;
    }

    return {
      phase: this.phase,
      cycleIndex: this.cycleIndex,
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

    if (this.combatElapsedTicks >= CYCLE_COMBAT_TICKS) {
      this.combatElapsedTicks = CYCLE_COMBAT_TICKS;
      this.phase = 'jumping';
      this.jumpingElapsedTicks = 0;
      return { type: 'CyclePhaseChanged', phase: 'jumping', cycleIndex: this.cycleIndex };
    }

    this.phase = phaseAtCombatTick(this.combatElapsedTicks);
    if (this.phase === previous) return null;
    return { type: 'CyclePhaseChanged', phase: this.phase, cycleIndex: this.cycleIndex };
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
