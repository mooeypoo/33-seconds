/**
 * What the debug readout shows during the platform check (ADR-0001 D4). Not gameplay state: it is
 * reported by the render loop and read by the HUD.
 */
export interface FrameStats {
  readonly fps: number;
  readonly ticks: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
  readonly scale: number;
  /** Viper position in world units, rounded. Also what the end-to-end tests read. */
  readonly viperX: number;
  readonly viperY: number;
  /** Null while no Raider is on screen (the short gap after a kill). */
  readonly raiderY: number | null;
  readonly shots: number;
  readonly kills: number;
  readonly cycleIndex: number;
  readonly cyclePhase: string;
  readonly secondsRemaining: number;
  readonly spoolProgress: number;
  readonly hull: number;
  readonly hullMax: number;
  readonly ejected: boolean;
  readonly ghosts: number;
  readonly returned: boolean;
  readonly raiderLive: boolean;
  readonly raiders: number;
}
