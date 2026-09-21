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
  /** True while this Raider is diving the fleet (PRD 7.1). */
  readonly strafing: boolean;
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

export interface CivilianShipView {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly galactica: boolean;
  readonly healthy: boolean;
  readonly justHit: boolean;
}

export interface FleetView {
  readonly integrity: number;
  readonly integrityMax: number;
  readonly damageThisCycle: number;
  readonly lastHitShipId: number | null;
  readonly ships: readonly CivilianShipView[];
}

export interface ResurrectionShipView {
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly hp: number;
  readonly hpMax: number;
  readonly destroyed: boolean;
  readonly shielded: boolean;
}

export interface GameView {
  readonly viper: ViperView;
  readonly projectiles: readonly ProjectileView[];
  readonly raiders: readonly RaiderView[];
  readonly ghosts: readonly GhostView[];
  readonly fleet: FleetView;
  readonly resurrectionShip: ResurrectionShipView | null;
  /**
   * True while kills still queue a download. False after the resurrection ship is gone: the last
   * wave is finite. Presenters and the HUD use this as the loop-on / loop-off tell (PRD 6).
   */
  readonly resurrectionsActive: boolean;
  readonly cycle: CycleView;
  readonly tickCount: number;
  readonly kills: number;
}
