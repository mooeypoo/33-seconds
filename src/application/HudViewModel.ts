import type { GameView } from '../domain/views';

/**
 * What the overlay HUD shows, derived from the game each frame (ADR-0002 D2). Flat on purpose: the
 * overlay copies it into a reactive store field by field, so only values that changed re-render.
 * The renderer is not involved. Gameplay never reads this.
 */
export interface HudViewModel {
  /** Game-clock ticks. Cosmetic animation in the overlay (portrait mouths) steps on this. */
  readonly tickCount: number;
  readonly cyclePhase: GameView['cycle']['phase'];
  readonly cycleIndex: number;
  readonly secondsRemaining: number;
  readonly spoolProgress: number;
  readonly fleetIntegrity: number;
  readonly fleetIntegrityMax: number;
  readonly missiles: number;
  readonly missilesMax: number;
  readonly speechActive: boolean;
  readonly speechReady: boolean;
  readonly speechRemainingSeconds: number;
  readonly speechJumpsUntilReady: number;
  /** The bonus taken most recently, or null before the first Apply. */
  readonly latestUpgradeId: string | null;
  /** How many older bonuses sit behind that name. */
  readonly olderUpgradeCount: number;
}

export function buildHudViewModel(view: GameView): HudViewModel {
  const order = view.upgradeOrder;
  return {
    tickCount: view.tickCount,
    cyclePhase: view.cycle.phase,
    cycleIndex: view.cycle.cycleIndex,
    secondsRemaining: view.cycle.secondsRemaining,
    spoolProgress: view.cycle.spoolProgress,
    fleetIntegrity: Math.round(view.fleet.integrity),
    fleetIntegrityMax: view.fleet.integrityMax,
    missiles: view.missileAmmo,
    missilesMax: view.missileAmmoMax,
    speechActive: view.speechActive,
    speechReady: view.speechReady,
    speechRemainingSeconds: view.speechRemainingSeconds,
    speechJumpsUntilReady: view.speechJumpsUntilReady,
    latestUpgradeId: order.at(-1) ?? null,
    olderUpgradeCount: Math.max(0, order.length - 1),
  };
}
