import { cardDefinition, type CardRarity } from '../domain/progression/catalog';
import type { GameView } from '../domain/views';

/** One owned card, for the loadout list. Newest last, like the upgrade order. */
export interface LoadoutEntry {
  readonly id: string;
  readonly stacks: number;
  readonly maxStacks: number;
  readonly rarity: CardRarity;
}

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
  /** *Starbuck's Lucky Streak* cover is running: "Lucky". */
  readonly lucky: boolean;
  /** True while kills still download: the loop is on (PRD 6). */
  readonly resurrectionsActive: boolean;
  /** This cycle's jump repair in whole percent, only when it changes by cycle (Endless); else null. */
  readonly repairPercent: number | null;
  readonly shipStatus: ShipStatus;
  readonly shipHp: number;
  readonly shipHpMax: number;
  readonly shipBaysOpen: boolean;
  /** Escort hull on station, summed. 0 with escorts means they are all in the hangar. */
  readonly raptorHp: number;
  readonly raptorHpMax: number;
  readonly sixPresent: boolean;
  readonly objective: ObjectiveId;
  /**
   * One character per fleet-line hull, in order: `1` ready, `0` dinged. A string, so the overlay's
   * field-by-field copy re-renders the ship list only when a hull changes.
   */
  readonly fleetShips: string;
  /** Owned cards, newest last. Replaced only when the loadout changes (see `sameLoadout`). */
  readonly loadout: readonly LoadoutEntry[];
}

/** True when two loadouts list the same cards and stacks, so the overlay can keep the old array. */
export function sameLoadout(left: readonly LoadoutEntry[], right: readonly LoadoutEntry[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry.id === right[index]?.id && entry.stacks === right[index].stacks);
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
    cycleProgress: inCombat ? Math.min(1, view.cycle.combatElapsedSeconds / view.cycle.combatSeconds) : 1,
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
    lucky: view.viper.lucky,
    resurrectionsActive: view.resurrectionsActive,
    repairPercent: view.fleetRepair.changes ? Math.round(view.fleetRepair.share * 100) : null,
    shipStatus,
    shipHp: ship === null ? 0 : Math.ceil(ship.hp),
    shipHpMax: ship?.hpMax ?? 0,
    shipBaysOpen: ship?.baysOpen ?? false,
    raptorHp: view.raptors.reduce((sum, raptor) => sum + (raptor.hangared ? 0 : raptor.hp), 0),
    raptorHpMax: view.raptors.reduce((sum, raptor) => sum + raptor.hpMax, 0),
    sixPresent: view.imaginarySix?.present === true,
    objective: objectiveFor(shipStatus),
    fleetShips: view.fleet.ships.map((hull) => (hull.healthy ? '1' : '0')).join(''),
    loadout: view.upgradeOrder.flatMap((id) => {
      const owned = view.loadout.find((card) => card.id === id);
      if (!owned) return [];
      return [{ id, stacks: owned.stacks, maxStacks: owned.maxStacks, rarity: cardDefinition(id).rarity }];
    }),
  };
}
