import type { DomainEvent } from '../shared/events';
import type { GameView } from '../views';

/**
 * The run's score (PRD 5.4, ADR-0002 5.2). It should read as how well the run went: kills count,
 * the resurrection ship counts more, and the fleet counts most, so guarding the civilians is never
 * the losing build. The numbers are data (`src/balance/scoring.json`); this is only the arithmetic.
 */
export interface ScoreWeights {
  /** Points per Raider destroyed, each time: a Raider that comes back scores again. */
  readonly raiderKill: number;
  readonly heavyKill: number;
  /** Points per hit point taken off the resurrection ship, shield hits excluded. */
  readonly resurrectionShipDamage: number;
  readonly resurrectionShipDestroyed: number;
  /** Taken away per eject. */
  readonly eject: number;
  /** Taken away per percent of Fleet Integrity lost over the run. Repairs do not give it back. */
  readonly fleetDamagePercent: number;
  /** Only for a win. */
  readonly winBonus: number;
  /** Only for a win: per percent of Fleet Integrity still standing at the end. */
  readonly fleetLeftPercent: number;
}

/** What the score is made of. Built by `RunTally` from events and the final view. */
export interface RunFacts {
  readonly won: boolean;
  /** The cycle the run ended in, from 1. */
  readonly cycle: number;
  readonly raiderKills: number;
  readonly heavyKills: number;
  readonly resurrectionShipDamage: number;
  readonly resurrectionShipDestroyed: boolean;
  readonly ejects: number;
  /** Percent of Fleet Integrity lost over the whole run, 0 up (it can pass 100 with repairs). */
  readonly fleetDamagePercent: number;
  /** Percent of Fleet Integrity left at the end, 0 to 100. */
  readonly fleetLeftPercent: number;
  /** The Raider destroyed most often, or null when none died twice. A joke stat (PRD 5.4). */
  readonly mostKilled: { readonly identityId: number; readonly kills: number } | null;
}

/** Whole points, never below zero: a bad run is a small number, not a debt. */
export function scoreRun(facts: RunFacts, weights: ScoreWeights): number {
  let points =
    facts.raiderKills * weights.raiderKill +
    facts.heavyKills * weights.heavyKill +
    facts.resurrectionShipDamage * weights.resurrectionShipDamage +
    (facts.resurrectionShipDestroyed ? weights.resurrectionShipDestroyed : 0) -
    facts.ejects * weights.eject -
    facts.fleetDamagePercent * weights.fleetDamagePercent;
  if (facts.won) points += weights.winBonus + facts.fleetLeftPercent * weights.fleetLeftPercent;
  return Math.max(0, Math.round(points));
}

/**
 * Watches one run's events and turns them into `RunFacts` at the end. It reads events only, never
 * the game's internals, so the score cannot change a rule. One tally per run.
 */
export class RunTally {
  private raiderKills = 0;
  private heavyKills = 0;
  private ejects = 0;
  private fleetDamage = 0;
  /** Which identity each live body wears, so a kill can be credited to the Raider that keeps coming back. */
  private readonly identityOf = new Map<number, number>();
  private readonly killsByIdentity = new Map<number, number>();

  note(events: readonly DomainEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case 'RaiderSpawned':
          if (!event.heavy) this.identityOf.set(event.id, event.identityId);
          break;
        case 'RaiderDestroyed': {
          if (event.heavy) {
            this.heavyKills += 1;
            break;
          }
          this.raiderKills += 1;
          const identity = this.identityOf.get(event.id);
          if (identity !== undefined) {
            this.identityOf.delete(event.id);
            this.killsByIdentity.set(identity, (this.killsByIdentity.get(identity) ?? 0) + 1);
          }
          break;
        }
        case 'ViperEjected':
          this.ejects += 1;
          break;
        case 'FleetHit':
          this.fleetDamage += event.damage;
          break;
        default:
          break;
      }
    }
  }

  /** The facts as of `view`, which should be the view on the tick the run ended. */
  facts(view: GameView, won: boolean): RunFacts {
    const ship = view.resurrectionShip;
    const shipDamage = ship ? (ship.destroyed ? ship.hpMax : ship.hpMax - ship.hp) : 0;
    const percent = 100 / view.fleet.integrityMax;
    return {
      won,
      cycle: view.cycle.cycleIndex,
      raiderKills: this.raiderKills,
      heavyKills: this.heavyKills,
      resurrectionShipDamage: Math.max(0, shipDamage),
      resurrectionShipDestroyed: ship?.destroyed === true,
      ejects: this.ejects,
      fleetDamagePercent: Math.round(this.fleetDamage * percent),
      fleetLeftPercent: Math.round(view.fleet.integrity * percent),
      mostKilled: this.mostKilled(),
    };
  }

  private mostKilled(): RunFacts['mostKilled'] {
    let best: { identityId: number; kills: number } | null = null;
    for (const [identityId, kills] of this.killsByIdentity) {
      // The lowest identity wins a tie, so the stat does not depend on map order.
      if (kills < 2) continue;
      if (!best || kills > best.kills || (kills === best.kills && identityId < best.identityId)) best = { identityId, kills };
    }
    return best;
  }
}
