import type { Fleet } from '../fleet/integrity';
import { FLEET_LINE_Y_UNITS } from '../fleet/integrity';
import type { Raptor } from '../fleet/raptor';
import type { Loadout } from '../progression/loadout';
import { movingCircleHitAlong, movingCircleHits } from '../shared/collision';
import type { DomainEvent } from '../shared/events';
import type { RandomStream } from '../shared/random';
import type { Playfield } from '../shared/world';
import type { Raider } from '../swarm/raider';
import type { ResurrectionShip } from '../swarm/resurrectionShip';
import { RESURRECTION_SHIP_RADIUS_UNITS } from '../swarm/resurrectionShip';
import type { Swarm } from '../swarm/Swarm';
import { CYLON_SAVE_INVULN_SECONDS } from '../progression/catalog';
import { SIX_DAMAGE, type ImaginarySix } from './imaginarySix';
import {
  MISSILE_HEAVY_DAMAGE,
  MISSILE_RADIUS_UNITS,
  MISSILE_RAIDER_DAMAGE,
  MISSILE_SHIP_DAMAGE,
  RESURRECTION_SHIP_LOCK_ID,
} from './missile';
import type { Munitions } from './Munitions';
import type { Projectile } from './projectile';
import { RAIDER_SHOT_RADIUS_UNITS } from './projectile';
import type { Viper } from './viper';

/**
 * Everything a hit can touch, as it stands at this point in the tick. `Game` builds it when hits
 * are resolved, so the Speech flag, the ship, and the escorts are current.
 */
export interface Battlefield {
  readonly swarm: Swarm;
  readonly munitions: Munitions;
  readonly viper: Viper;
  readonly loadout: Loadout;
  readonly fleet: Fleet;
  /** Flak rolls draw from the gameplay stream. */
  readonly scenario: RandomStream;
  readonly playfield: Playfield;
  readonly speechActive: boolean;
  readonly resurrectionShip: ResurrectionShip | null;
  readonly raptors: readonly Raptor[];
  readonly six: ImaginarySix | null;
  /** Kills a Raider the one way every weapon does. */
  destroyRaider(raider: Raider, events: DomainEvent[]): void;
}

/**
 * Resolves this tick's hits in a fixed order: the Viper's gun, missiles, Cylon rounds on the
 * Viper, then rounds that reach the fleet line. The order matters: a round spent on one target is
 * gone for the next.
 */
export function resolveHits(field: Battlefield, events: DomainEvent[]): void {
  resolvePlayerHits(field, events);
  resolveMissileHits(field, events);
  resolveCylonHits(field, events);
  resolveFleetHits(field, events);
  field.munitions.dropDead();
}

function resolvePlayerHits(field: Battlefield, events: DomainEvent[]): void {
  const { swarm, loadout } = field;
  const raiders = swarm.raiders;
  for (const shot of field.munitions.shots) {
    if (!shot.alive || shot.owner !== 'player') continue;
    const view = shot.toView();

    let hitRaider = false;
    for (let index = 0; index < raiders.length; index++) {
      const raider = raiders[index];
      if (!raider) continue;
      // Spawn protection: shots pass through so a Returned is not a free kill.
      if (raider.isProtected) continue;
      const hit = movingCircleHits(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        loadout.playerShotRadius,
        raider.x,
        raider.y,
        swarm.radiusOf(raider),
      );
      if (!hit) continue;

      hitRaider = true;
      if (raider.takeHit()) {
        field.destroyRaider(raider, events);
        index -= 1;
      } else {
        events.push({ type: 'RaiderHit', id: raider.id, x: view.x, y: view.y, hp: raider.hp, heavy: raider.kind === 'heavy' });
      }
      if (!shot.tryPierce()) {
        shot.kill();
        break;
      }
    }
    if (hitRaider) continue;
    if (tryDelayGhost(field, shot, view, events)) continue;
    const ship = field.resurrectionShip;
    if (!ship || ship.isDestroyed) continue;
    const hitsShip = movingCircleHits(
      view.previousX,
      view.previousY,
      view.x,
      view.y,
      loadout.playerShotRadius,
      ship.x,
      ship.y,
      RESURRECTION_SHIP_RADIUS_UNITS,
    );
    if (!hitsShip) continue;
    shot.kill();
    const shielded = ship.isShielded;
    if (ship.takeHit(loadout.shipDamage(1, ship.baysOpen))) {
      events.push({ type: 'ResurrectionShipDestroyed', x: ship.x, y: ship.y });
    } else {
      events.push({ type: 'ResurrectionShipHit', x: view.x, y: view.y, hp: ship.hp, shielded });
    }
  }
}

/**
 * *Spoilers*: a gun hit on a blip delays that download. Live Raiders soak first so the killing
 * round is not a free delay. Missiles ignore ghosts (a delay is not worth the rack).
 */
function tryDelayGhost(
  field: Battlefield,
  shot: Projectile,
  view: { readonly previousX: number; readonly previousY: number; readonly x: number; readonly y: number },
  events: DomainEvent[],
): boolean {
  const delaySeconds = field.loadout.ghostDelaySeconds;
  if (delaySeconds <= 0) return false;

  const best = field.swarm.ghostOnPath(view.previousX, view.previousY, view.x, view.y, field.loadout.playerShotRadius);
  if (!best) return false;

  best.delay(delaySeconds);
  events.push({
    type: 'GhostDelayed',
    identityId: best.identityId,
    remainingSeconds: best.remaining,
    x: best.x,
    y: field.swarm.spawnY,
  });
  if (!shot.tryPierce()) {
    shot.kill();
    return true;
  }
  return false;
}

/**
 * Hits the first hostile on the path, not the lock. An escort in front of the ship soaks the
 * round even when the reticle is on the factory (PRD 8.2).
 */
function resolveMissileHits(field: Battlefield, events: DomainEvent[]): void {
  const { swarm, loadout } = field;
  for (const missile of field.munitions.missiles) {
    if (!missile.alive) continue;
    const view = missile.toView();

    let bestAlong = Infinity;
    let bestId = Infinity;
    let hitRaider: Raider | null = null;
    let hitShip = false;

    for (const raider of swarm.raiders) {
      if (raider.isProtected) continue;
      const along = movingCircleHitAlong(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        MISSILE_RADIUS_UNITS,
        raider.x,
        raider.y,
        swarm.radiusOf(raider),
      );
      if (along === null) continue;
      if (along < bestAlong || (along === bestAlong && raider.id < bestId)) {
        bestAlong = along;
        bestId = raider.id;
        hitRaider = raider;
        hitShip = false;
      }
    }

    const ship = field.resurrectionShip;
    if (ship && !ship.isDestroyed) {
      const along = movingCircleHitAlong(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        MISSILE_RADIUS_UNITS,
        ship.x,
        ship.y,
        RESURRECTION_SHIP_RADIUS_UNITS,
      );
      if (along !== null && (along < bestAlong || (along === bestAlong && RESURRECTION_SHIP_LOCK_ID < bestId))) {
        hitRaider = null;
        hitShip = true;
      }
    }

    if (!hitRaider && !hitShip) continue;
    missile.kill();
    const shipShielded = ship?.isShielded === true;
    // A missile kills a Raider outright and dents a heavy one (ADR-0002 3.3).
    const missileDamage = hitRaider?.kind === 'heavy' ? MISSILE_HEAVY_DAMAGE : MISSILE_RAIDER_DAMAGE;
    if (hitRaider) {
      if (hitRaider.takeHit(missileDamage)) field.destroyRaider(hitRaider, events);
      else events.push({ type: 'RaiderHit', id: hitRaider.id, x: view.x, y: view.y, hp: hitRaider.hp, heavy: hitRaider.kind === 'heavy' });
    }
    if (hitShip && ship) {
      if (ship.takeHit(loadout.shipDamage(MISSILE_SHIP_DAMAGE, ship.baysOpen))) {
        events.push({ type: 'ResurrectionShipDestroyed', x: ship.x, y: ship.y });
      } else {
        events.push({ type: 'ResurrectionShipHit', x: view.x, y: view.y, hp: ship.hp, shielded: shipShielded });
      }
    }
  }
}

function resolveCylonHits(field: Battlefield, events: DomainEvent[]): void {
  const { viper, loadout, speechActive } = field;
  if (!speechActive && !viper.isVulnerable) return;

  for (const shot of field.munitions.shots) {
    if (!shot.alive || shot.owner !== 'cylon') continue;
    const view = shot.toView();
    const hit = movingCircleHits(
      view.previousX,
      view.previousY,
      view.x,
      view.y,
      RAIDER_SHOT_RADIUS_UNITS,
      viper.x,
      viper.y,
      loadout.viperRadius * field.playfield.fighterScale,
    );
    if (!hit) continue;

    shot.kill();
    // ASSUMPTION: The Speech eats rounds that hit the Viper so they do not become fleet strays.
    if (speechActive) continue;
    if (viper.takeHit()) {
      if (loadout.tryCylonSave()) {
        viper.absorbDownload(CYLON_SAVE_INVULN_SECONDS);
        events.push({ type: 'ViperDownloaded', x: viper.x, y: viper.y });
        return;
      }
      events.push({ type: 'ViperEjected', x: viper.x, y: viper.y });
      return;
    }
    events.push({ type: 'ViperHit', x: view.x, y: view.y, hp: viper.hp });
  }
}

function resolveFleetHits(field: Battlefield, events: DomainEvent[]): void {
  const { loadout, fleet } = field;
  for (const shot of field.munitions.shots) {
    if (!shot.alive || !shot.crossedFleetLine(FLEET_LINE_Y_UNITS)) continue;
    const x = shot.toView().x;
    shot.kill();
    if (tryRaptorSoak(field, x, events)) continue;
    const chance = loadout.flakInterceptChance;
    // No roll without the card. Not a scenario promise any more (ADR-0001 D3); it keeps seeded
    // tests without flak on the same numbers.
    if (chance > 0 && field.scenario.next() < chance) {
      events.push({ type: 'FlakIntercepted', x, y: FLEET_LINE_Y_UNITS });
      continue;
    }
    const damage = fleet.takeStray(x, loadout.fleetCycleDamageCap);
    if (damage > 0) {
      const view = fleet.view;
      events.push({
        type: 'FleetHit',
        damage,
        integrity: view.integrity,
        x,
        shipId: view.lastHitShipId ?? 0,
        kind: 'stray',
      });
    }
  }
}

/**
 * A stray that lands on a Raptor is eaten. Nearest escort on a tie. Strafes are not soaked
 * (PRD 10.2).
 */
function tryRaptorSoak(field: Battlefield, x: number, events: DomainEvent[]): boolean {
  let best: Raptor | null = null;
  let bestDistance = Infinity;
  for (const raptor of field.raptors) {
    if (!raptor.canSoak(x)) continue;
    const distance = Math.abs(raptor.x - x);
    if (distance < bestDistance || (distance === bestDistance && raptor.id < (best?.id ?? Infinity))) {
      best = raptor;
      bestDistance = distance;
    }
  }
  if (!best) return false;
  const hangared = best.takeHit();
  events.push({ type: 'RaptorHit', id: best.id, hp: best.hp, x: best.x, y: best.y });
  if (hangared) {
    events.push({ type: 'RaptorHangared', id: best.id, x: best.x, y: best.y });
  }
  return true;
}

/**
 * *Imaginary Six*'s fleet-defense beam: strafing Raiders first, then stray rounds, in range only.
 * She does not shoot parked Raiders or the factory (PRD 10.3).
 */
export function fireSix(field: Battlefield, tickSeconds: number, events: DomainEvent[]): void {
  const six = field.six;
  if (!six?.isPresent) return;
  six.advance(tickSeconds);
  const target = pickSixTarget(field, six);
  if (!target) {
    six.clearAim();
    return;
  }
  six.pointAt(target.x, target.y);
  if (!six.readyToFire) return;
  six.spentShot();
  events.push({
    type: 'SixFired',
    x: six.x,
    y: six.y,
    targetX: target.x,
    targetY: target.y,
    kind: target.kind,
  });
  if (target.kind === 'stray') {
    target.shot.kill();
    events.push({ type: 'SixIntercepted', x: target.x, y: target.y });
    return;
  }
  const raider = target.raider;
  if (raider.takeHit(SIX_DAMAGE)) field.destroyRaider(raider, events);
  else events.push({ type: 'RaiderHit', id: raider.id, x: raider.x, y: raider.y, hp: raider.hp, heavy: raider.kind === 'heavy' });
}

function pickSixTarget(
  field: Battlefield,
  six: ImaginarySix,
):
  | { readonly kind: 'strafe'; readonly raider: Raider; readonly x: number; readonly y: number }
  | { readonly kind: 'stray'; readonly shot: Projectile; readonly x: number; readonly y: number }
  | null {
  let bestStrafe: Raider | null = null;
  for (const raider of field.swarm.raiders) {
    if (!raider.isStrafing || raider.isProtected) continue;
    if (!six.inRange(raider.x, raider.y)) continue;
    if (!bestStrafe || raider.y > bestStrafe.y || (raider.y === bestStrafe.y && raider.id < bestStrafe.id)) {
      bestStrafe = raider;
    }
  }
  if (bestStrafe) return { kind: 'strafe', raider: bestStrafe, x: bestStrafe.x, y: bestStrafe.y };

  let bestShot: Projectile | null = null;
  for (const shot of field.munitions.shots) {
    if (!shot.alive || shot.owner !== 'cylon' || !shot.isStray) continue;
    if (!six.inRange(shot.x, shot.y)) continue;
    if (!bestShot || shot.y > bestShot.y || (shot.y === bestShot.y && shot.id < bestShot.id)) {
      bestShot = shot;
    }
  }
  if (bestShot) return { kind: 'stray', shot: bestShot, x: bestShot.x, y: bestShot.y };
  return null;
}
