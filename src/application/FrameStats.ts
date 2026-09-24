import type { GameView } from '../domain/views';

/**
 * The debug readout (ADR-0001 D4 platform check, ADR-0002 D2). A development aid and the window the
 * end-to-end tests read. It is not the HUD: the overlay HUD reads `HudViewModel`.
 *
 * The renderer measures only what it owns (`RenderStats`). Everything about the game comes from
 * `debugFacts`, so the renderer never has to know a rule.
 */
export interface RenderStats {
  readonly fps: number;
  readonly renderWidth: number;
  readonly renderHeight: number;
  readonly scale: number;
}

export interface DebugFacts {
  readonly ticks: number;
  /** Viper position in world units, rounded. Also what the end-to-end tests read. */
  readonly viperX: number;
  readonly viperY: number;
  readonly shots: number;
  readonly kills: number;
  readonly hull: number;
  readonly hullMax: number;
  readonly ejected: boolean;
  readonly ghosts: number;
  readonly returned: boolean;
  readonly raiderLive: boolean;
  readonly raiders: number;
  readonly shipHp: number | null;
  readonly shipHpMax: number | null;
  readonly shipDestroyed: boolean;
  readonly shipShielded: boolean;
  readonly shipBaysOpen: boolean;
  readonly resurrectionsActive: boolean;
  readonly missiles: number;
  readonly missilesMax: number;
  readonly speechActive: boolean;
  readonly speechReady: boolean;
  readonly speechJumpsUntilReady: number;
  readonly cards: number;
  readonly cylonEye: boolean;
  readonly raptorHp: number;
  readonly raptorHpMax: number;
  readonly sixPresent: boolean;
  readonly tier: GameView['tier'];
}

export type FrameStats = RenderStats & DebugFacts;

export function debugFacts(view: GameView): DebugFacts {
  const ship = view.resurrectionShip;
  return {
    ticks: view.tickCount,
    viperX: Math.round(view.viper.x),
    viperY: Math.round(view.viper.y),
    shots: view.projectiles.length,
    kills: view.kills,
    hull: view.viper.hp,
    hullMax: view.viper.hpMax,
    ejected: view.viper.ejected,
    ghosts: view.ghosts.length,
    returned: view.raiders.some((raider) => raider.returned),
    raiderLive: view.raiders.length > 0,
    raiders: view.raiders.length,
    shipHp: ship === null ? null : Math.round(ship.hp),
    shipHpMax: ship?.hpMax ?? null,
    shipDestroyed: ship?.destroyed ?? false,
    shipShielded: ship?.shielded ?? false,
    shipBaysOpen: ship?.baysOpen ?? false,
    resurrectionsActive: view.resurrectionsActive,
    missiles: view.missileAmmo,
    missilesMax: view.missileAmmoMax,
    speechActive: view.speechActive,
    speechReady: view.speechReady,
    speechJumpsUntilReady: view.speechJumpsUntilReady,
    cards: view.loadout.reduce((sum, card) => sum + card.stacks, 0),
    cylonEye: view.viper.cylonEye,
    raptorHp: view.raptors.reduce((sum, raptor) => sum + (raptor.hangared ? 0 : raptor.hp), 0),
    raptorHpMax: view.raptors.reduce((sum, raptor) => sum + raptor.hpMax, 0),
    sixPresent: view.imaginarySix?.present === true,
    tier: view.tier,
  };
}
