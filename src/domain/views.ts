/**
 * Read-only views of domain state, read once per frame by presenters (ADR-0001 D2).
 * Nothing outside the domain may mutate these, and the domain does not copy them per frame.
 */
export interface ViperView {
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly velocityX: number;
  readonly velocityY: number;
}

export interface GameView {
  readonly viper: ViperView;
  readonly tickCount: number;
}
