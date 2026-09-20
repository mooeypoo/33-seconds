/**
 * Read-only views of domain state, read once per frame by presenters (ADR-0001 D2).
 * Nothing outside the domain may mutate these, and the domain does not copy whole aggregates
 * per frame: each view is a small plain object of numbers.
 */
export interface ViperView {
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly hp: number;
  readonly ejected: boolean;
}

export type ProjectileOwner = 'player' | 'cylon';

export interface ProjectileView {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly owner: ProjectileOwner;
  readonly stray: boolean;
}

export interface RaiderView {
  readonly id: number;
  readonly identityId: number;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly hp: number;
  readonly deaths: number;
  readonly returned: boolean;
  readonly protected: boolean;
  /** True while this Raider holds an attack token and may fire (PRD 9). */
  readonly armed: boolean;
}

/** A destroyed Raider still downloading. The blip sits where it died. */
export interface GhostView {
  readonly identityId: number;
  readonly deaths: number;
  readonly x: number;
  readonly y: number;
  readonly remainingSeconds: number;
}

export interface CycleView {
  readonly phase: 'arriving' | 'building' | 'spooling' | 'jumping' | 'recovering';
  readonly cycleIndex: number;
  readonly combatElapsedSeconds: number;
  /** Whole seconds still on the 33, or 0 once the fleet is jumping or recovering. */
  readonly secondsRemaining: number;
  /** 0..1 of the FTL spool. Zero before spooling, one from the jump onward. */
  readonly spoolProgress: number;
}

export interface GameView {
  readonly viper: ViperView;
  readonly projectiles: readonly ProjectileView[];
  readonly raiders: readonly RaiderView[];
  readonly ghosts: readonly GhostView[];
  readonly cycle: CycleView;
  readonly tickCount: number;
  readonly kills: number;
}
