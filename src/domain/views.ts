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
}

export interface ProjectileView {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
}

export interface RaiderView {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly hp: number;
}

export interface GameView {
  readonly viper: ViperView;
  readonly projectiles: readonly ProjectileView[];
  readonly raider: RaiderView | null;
  readonly tickCount: number;
  readonly kills: number;
}
