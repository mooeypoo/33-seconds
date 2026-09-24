import { CYCLE_COMBAT_SECONDS } from '../domain/cycle/jumpCycle';
import type { GameView } from '../domain/views';

/**
 * Where the run is, for the objective line (ADR-0002 1.6). The words live in `content/hud.json`.
 * - `hold`: no resurrection ship yet. Keep the fleet alive to the jump.
 * - `shielded`: the ship is on the map but cannot be hurt.
 * - `destroy`: the shield is down.
 * - `last-wave`: the ship is gone; clear what is left.
 */
export type ObjectiveId = 'hold' | 'shielded' | 'destroy' | 'last-wave';

/** The resurrection ship as the HUD names it. `none` until it arrives. */
export type ShipStatus = 'none' | 'shielded' | 'exposed' | 'destroyed';

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
  /** 0..1 of the 33 seconds already spent, for the jump bar. 1 from the jump onward. */
  readonly cycleProgress: number;
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

  // The words behind the colour tells (PRD 15, ADR-0002 1.3). A release build shows these.
  readonly hull: number;
  readonly hullMax: number;
  readonly ejected: boolean;
  /** *Anyone Could Be a Cylon* saved the pilot this cycle: "two transponders". */
  readonly cylonEye: boolean;
  /** True while kills still download: the loop is on (PRD 6). */
  readonly resurrectionsActive: boolean;
  readonly shipStatus: ShipStatus;
  readonly shipHp: number;
  readonly shipHpMax: number;
  readonly shipBaysOpen: boolean;
  /** Escort hull on station, summed. 0 with escorts means they are all in the hangar. */
  readonly raptorHp: number;
  readonly raptorHpMax: number;
  readonly sixPresent: boolean;
  readonly objective: ObjectiveId;
}

function shipStatusOf(view: GameView): ShipStatus {
  const ship = view.resurrectionShip;
  if (ship === null) return 'none';
  if (ship.destroyed) return 'destroyed';
  return ship.shielded ? 'shielded' : 'exposed';
}

function objectiveFor(ship: ShipStatus): ObjectiveId {
  if (ship === 'none') return 'hold';
  if (ship === 'shielded') return 'shielded';
  if (ship === 'exposed') return 'destroy';
  return 'last-wave';
}

export function buildHudViewModel(view: GameView): HudViewModel {
  const order = view.upgradeOrder;
  const ship = view.resurrectionShip;
  const shipStatus = shipStatusOf(view);
  const inCombat = view.cycle.phase !== 'jumping' && view.cycle.phase !== 'recovering';
  return {
    tickCount: view.tickCount,
    cyclePhase: view.cycle.phase,
    cycleIndex: view.cycle.cycleIndex,
    secondsRemaining: view.cycle.secondsRemaining,
    spoolProgress: view.cycle.spoolProgress,
    cycleProgress: inCombat ? Math.min(1, view.cycle.combatElapsedSeconds / CYCLE_COMBAT_SECONDS) : 1,
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
    hull: view.viper.hp,
    hullMax: view.viper.hpMax,
    ejected: view.viper.ejected,
    cylonEye: view.viper.cylonEye,
    resurrectionsActive: view.resurrectionsActive,
    shipStatus,
    shipHp: ship === null ? 0 : Math.ceil(ship.hp),
    shipHpMax: ship?.hpMax ?? 0,
    shipBaysOpen: ship?.baysOpen ?? false,
    raptorHp: view.raptors.reduce((sum, raptor) => sum + (raptor.hangared ? 0 : raptor.hp), 0),
    raptorHpMax: view.raptors.reduce((sum, raptor) => sum + raptor.hpMax, 0),
    sixPresent: view.imaginarySix?.present === true,
    objective: objectiveFor(shipStatus),
  };
}
