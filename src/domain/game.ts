import { damageBand, type DamageBand } from './cycle/damageBand';
import { JumpCycle } from './cycle/jumpCycle';
import { Viper, VIPER_HALF_HEIGHT_UNITS, VIPER_HULL_HIT_POINTS } from './combat/viper';
import {
  MAX_CYLON_SHOTS,
  MAX_PLAYER_SHOTS,
  Projectile,
  RAIDER_SHOT_RADIUS_UNITS,
  RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
} from './combat/projectile';
import {
  MAX_MISSILES,
  MISSILE_CAPACITY,
  MISSILE_RADIUS_UNITS,
  MISSILE_RAIDER_DAMAGE,
  MISSILE_SHIP_DAMAGE,
  Missile,
  RESURRECTION_SHIP_LOCK_ID,
} from './combat/missile';
import { pickMissileLock, type LockCandidate } from './combat/targeting';
import { Speech } from './combat/speech';
import { ImaginarySix, SIX_DAMAGE } from './combat/imaginarySix';
import { CYLON_SAVE_INVULN_SECONDS, type CardId } from './progression/catalog';
import { Loadout } from './progression/loadout';
import type { DomainEvent } from './shared/events';
import { movingCircleHitAlong, movingCircleHits } from './shared/collision';
import type { InputIntent } from './shared/intent';
import { createRandomStream, type RandomStream } from './shared/random';
import { TICK_SECONDS } from './shared/time';
import {
  Raider,
  RAIDER_HALF_HEIGHT_UNITS,
  RAIDER_HALF_WIDTH_UNITS,
  RAIDER_RADIUS_UNITS,
  raiderSpawnMaxX,
  raiderSpawnMinX,
} from './swarm/raider';
import type { CycleProfile } from './balance/profile';
import { Fleet, FLEET_CYCLE_DAMAGE_CAP, FLEET_INTEGRITY_MAX, FLEET_LINE_Y_UNITS, FLEET_REPAIR_OF_MISSING } from './fleet/integrity';
import { Raptor, raptorLaunchX } from './fleet/raptor';
import { ATTACK_TOKENS, DIRECTOR_CAP, Download, GHOST_RADIUS_UNITS, STRAFE_TOKENS } from './swarm/resurrection';
import {
  ResurrectionShip,
  RESURRECTION_SHIP_ARRIVES_CYCLE,
  RESURRECTION_SHIP_HIT_POINTS,
  RESURRECTION_SHIP_RADIUS_UNITS,
  RESURRECTION_SHIP_VULNERABLE_CYCLE,
} from './swarm/resurrectionShip';
import type { GameView } from './views';
import { PHONE_PLAYFIELD, type Playfield } from './shared/world';

/**
 * Seed used when the caller does not pass one. The same seed on the same playfield is the same
 * scenario. A phone and a desktop do not share a playfield, so they do not share a scenario.
 */
export const DEFAULT_RUN_SEED = 1;

export interface GameOptions {
  /** Scenario stream seed (ADR-0001 D3). Same seed, same spawn column. */
  readonly seed?: number;
  /**
   * When false, Raiders fly but hold fire. Movement tests and the future harness use this so they
   * can drive the Viper without a dogfight. Play always leaves it on.
   */
  readonly raidersFire?: boolean;
  /**
   * First cycle the resurrection ship is on the map, still shielded. Play uses 2 (PRD 5.2).
   */
  readonly resurrectionShipArrivesCycle?: number;
  /**
   * First cycle the shield is down and HP can be chipped. Play uses 4 (PRD 5.2). If this is
   * earlier than the arrive cycle, the ship arrives already exposed.
   */
  readonly resurrectionShipVulnerableCycle?: number;
  /**
   * Hit points for the resurrection ship. Play uses 60 (PRD decision 3). Tests can use 1 so a
   * kill is one shot, not a twelve-second volley.
   */
  readonly resurrectionShipHitPoints?: number;
  /**
   * When false, the Viper holds its gun. Missile tests use this so a kill is the missile's, not
   * three auto-fire rounds. Play always leaves it on.
   */
  readonly viperFires?: boolean;
  /**
   * Starting Fleet Integrity. Play uses 100. Tests can start near the floor so a dive can end
   * the run; Civilian Run numbers cannot reach zero in a normal cycle (PRD 7.2).
   */
  readonly fleetStartingIntegrity?: number;
  /**
   * Difficulty numbers (ADR-0001 D9). Play injects Viper Pilot. Tests that omit this stay on
   * Civilian Run numbers so existing cap math does not move.
   */
  readonly tierProfile?: CycleProfile;
  /**
   * Cards already stacked at launch. Tests use this so an effect is not gated on a random offer.
   * Play always starts empty.
   */
  readonly startingCards?: readonly CardId[];
  /**
   * Lane width and fighter scale. Omitted means the phone world, so existing tests stay put.
   * A desktop run passes the wider playfield (PRD decision 14).
   */
  readonly playfield?: Playfield;
}

/**
 * The whole simulation behind one entry point: `tick(intent)` mutates state and returns the facts
 * that happened (ADR-0001 D2). It knows nothing about frames, pause, rendering, or input devices,
 * which is what lets it run in tests and in the balance harness (ADR-0001 D13).
 */
export class Game {
  private readonly scenario: RandomStream;
  /** Station-keeping for the resurrection ship. Separate so a wander cannot steal spawn rolls. */
  private readonly station: RandomStream;
  private readonly raidersFire: boolean;
  private readonly viperFires: boolean;
  private readonly resurrectionShipArrivesCycle: number;
  private readonly resurrectionShipVulnerableCycle: number;
  private readonly resurrectionShipHitPoints: number;
  private readonly cycle = new JumpCycle();
  private readonly playfield: Playfield;
  private readonly fleet: Fleet;
  private readonly profile: CycleProfile;
  private raptors: Raptor[] = [];
  private six: ImaginarySix | null = null;
  private readonly viper: Viper;
  private readonly shots: Projectile[] = [];
  private readonly liveShots: Projectile[] = [];
  private readonly missiles: Missile[] = [];
  private readonly liveMissiles: Missile[] = [];
  private readonly raiders: Raider[] = [];
  private readonly downloads: Download[] = [];
  private resurrectionShip: ResurrectionShip | null = null;
  private runWon = false;
  private runLost = false;
  private nextId = 1;
  private nextIdentityId = 1;
  private ticks = 0;
  private fireCooldownSeconds = 0;
  private kills = 0;
  private missileHeld = false;
  private specialHeld = false;
  private readonly speech = new Speech();
  private readonly loadout: Loadout;
  private recoveryBand: DamageBand = 'clean';
  /**
   * The last view built. Presenters, the HUD, and the session read it several times a frame, so it
   * is built once per state change instead of once per read (ADR-0001 D2, ADR-0002 0.5). Every
   * public method that changes state clears it.
   */
  private cachedView: GameView | null = null;

  constructor(options: GameOptions = {}) {
    const seed = options.seed ?? DEFAULT_RUN_SEED;
    this.scenario = createRandomStream(seed);
    this.station = createRandomStream((seed ^ 0x51ed) >>> 0);
    this.raidersFire = options.raidersFire ?? true;
    this.viperFires = options.viperFires ?? true;
    this.resurrectionShipArrivesCycle = options.resurrectionShipArrivesCycle ?? RESURRECTION_SHIP_ARRIVES_CYCLE;
    const vulnerable = options.resurrectionShipVulnerableCycle ?? RESURRECTION_SHIP_VULNERABLE_CYCLE;
    this.resurrectionShipVulnerableCycle = Math.max(this.resurrectionShipArrivesCycle, vulnerable);
    this.resurrectionShipHitPoints = options.resurrectionShipHitPoints ?? RESURRECTION_SHIP_HIT_POINTS;
    this.profile = options.tierProfile ?? {
      id: 'civilian-ship',
      fleetCycleDamageCap: FLEET_CYCLE_DAMAGE_CAP,
      fleetRepairOfMissing: FLEET_REPAIR_OF_MISSING,
    };
    this.playfield = options.playfield ?? PHONE_PLAYFIELD;
    this.viper = new Viper(this.playfield.width, this.playfield.fighterScale);
    this.fleet = new Fleet(options.fleetStartingIntegrity ?? FLEET_INTEGRITY_MAX, this.playfield.width);
    this.loadout = new Loadout(options.startingCards ?? [], this.profile.fleetCycleDamageCap);
    this.launchRaptors();
    this.syncSix();
  }

  /** Advances the simulation by exactly one tick. The only way to change domain state. */
  tick(intent: InputIntent): readonly DomainEvent[] {
    this.cachedView = null;
    const events: DomainEvent[] = [];

    if (this.ticks === 0) {
      events.push(this.cycle.begin());
      events.push({ type: 'ViperSpawned', x: this.viper.x, y: this.viper.y });
    }

    const phaseChange = this.cycle.advance(TICK_SECONDS);
    if (phaseChange) {
      events.push(phaseChange);
      if (phaseChange.phase === 'jumping') {
        this.clearTheSky(events);
        this.viper.resetAtJump();
        this.fleet.repairAtJump(this.profile.fleetRepairOfMissing);
        this.recoveryBand = damageBand(this.fleet.view.lastCycleDamage, this.viper.scarHullLost, this.viper.scarEjected);
        this.speech.onJump();
        this.loadout.onJump();
        events.push({ type: 'FleetRepaired', integrity: this.fleet.view.integrity });
      }
      if (phaseChange.phase === 'recovering') {
        this.loadout.openOffer(this.scenario);
      }
    }

    this.maybeArriveShip(events);
    this.maybeExposeShip(events);
    this.resurrectionShip?.advance(TICK_SECONDS, this.station);

    this.viper.steer(
      intent.moveX,
      intent.moveY,
      TICK_SECONDS,
      this.loadout.viperMaxSpeed,
      this.loadout.viperScale,
    );
    this.six?.follow(this.viper.x, this.viper.y, this.viper.isEjected);
    if (this.viper.isReadyForPickup) {
      this.viper.recoverFromEject();
      events.push({ type: 'ViperRecovered', x: this.viper.x, y: this.viper.y });
    }

    const missileRising = this.noteMissilePress(intent);
    const specialRising = this.noteSpecialPress(intent);
    if (this.speech.advance(TICK_SECONDS)) {
      events.push({ type: 'SpeechEnded' });
    }

    if (this.cycle.isInCombat) {
      this.resurrectionShip?.advanceBays(TICK_SECONDS);
      this.fillTheSwarm(events);
      this.assignAttackTokens();
      this.assignStrafeTokens();
      this.autoFire(events);
      this.maybeFireMissile(missileRising, events);
      this.maybeStartSpeech(specialRising, events);
      this.raiderFire(events);
      this.advanceShots();
      this.advanceMissiles();
      this.fireSix(events);
      this.advanceRaiders(events);
      this.advanceRaptors();
      this.resolveHits(events);
      this.reclaimShotsThatLeft();
      this.reclaimMissilesThatLeft();
      this.advanceDownloads();
      this.fillTheSwarm(events);
    }

    this.ticks += 1;
    this.maybeLose(events);
    this.maybeWin(events);
    this.six?.follow(this.viper.x, this.viper.y, this.viper.isEjected);
    return events;
  }

  /**
   * Leaves Recovering for the next cycle. The only way Recovering ends: there is no timer on this
   * decision (PRD 5.1).
   */
  continueFromJump(): readonly DomainEvent[] {
    this.cachedView = null;
    const change = this.cycle.continueFromJump();
    if (!change) return [];
    this.loadout.clearOffer();
    this.loadout.onCycleStart();
    const events: DomainEvent[] = [change];
    this.launchRaptors();
    this.syncSix();
    this.viper.resetAtJump();
    this.six?.follow(this.viper.x, this.viper.y, this.viper.isEjected);
    this.maybeArriveShip(events);
    this.maybeExposeShip(events);
    this.fillTheSwarm(events);
    return events;
  }

  /**
   * Picks a card from the Recovering table and starts the next cycle. The pick *is* Continue
   * (PRD 5.1). Ignored unless recovering and that card is on the table.
   */
  pickUpgrade(cardId: string): readonly DomainEvent[] {
    this.cachedView = null;
    if (!this.cycle.isRecovering) return [];
    if (!this.loadout.pick(cardId)) return [];
    return [{ type: 'UpgradePicked', cardId }, ...this.continueFromJump()];
  }

  /** One free reroll per Recovering (PRD 10.1). */
  rerollOffer(): readonly DomainEvent[] {
    this.cachedView = null;
    if (!this.cycle.isRecovering) return [];
    if (!this.loadout.reroll(this.scenario)) return [];
    return [{ type: 'UpgradeRerolled' }];
  }

  /** A read-only snapshot for presenters, built at most once per state change. */
  get view(): GameView {
    this.cachedView ??= this.buildView();
    return this.cachedView;
  }

  private buildView(): GameView {
    const viper = this.viper;
    return {
      tickCount: this.ticks,
      kills: this.kills,
      viper: {
        x: viper.x,
        y: viper.y,
        previousX: viper.previousX,
        previousY: viper.previousY,
        velocityX: viper.velocityXUnitsPerSecond,
        velocityY: viper.velocityYUnitsPerSecond,
        hp: viper.hp,
        hpMax: VIPER_HULL_HIT_POINTS,
        ejected: viper.isEjected,
        ejectProgress: viper.ejectProgress,
        maxSpeed: this.loadout.viperMaxSpeed,
        scale: this.loadout.viperScale * this.playfield.fighterScale,
        cylonEye: this.loadout.cylonEye,
      },
      projectiles: this.liveShots.map((shot) => shot.toView()),
      missiles: this.liveMissiles.map((missile) => missile.toView()),
      missileLock: this.lockView(),
      missileAmmo: this.viper.missileAmmo,
      missileAmmoMax: MISSILE_CAPACITY,
      raiders: this.raiders.map((raider) => raider.toView()),
      ghosts: this.downloads.map((download) => ({
        identityId: download.identityId,
        deaths: download.deaths,
        x: download.x,
        // Spoilers: sit on the return column at spawn height so you can see and shoot the future
        // (PRD 10.2). Without the card the bar stays on the corpse.
        y: this.loadout.ghostsAreShootable ? this.raiderSpawnY : download.y,
        remainingSeconds: download.remaining,
        progress: download.progress,
        shootable: this.loadout.ghostsAreShootable,
      })),
      fleet: this.fleet.view,
      worldWidth: this.playfield.width,
      fighterScale: this.playfield.fighterScale,
      tier: this.profile.id,
      raptors: this.raptors.map((raptor) => raptor.toView()),
      imaginarySix: this.six?.isPresent ? this.six.toView() : null,
      resurrectionShip: this.resurrectionShip?.toView() ?? null,
      resurrectionsActive: this.resurrectionShip?.isDestroyed !== true,
      speechActive: this.speech.isActive,
      speechReady: this.speech.isReady,
      speechRemainingSeconds: this.speech.remaining,
      speechJumpsUntilReady: this.speech.jumpsUntilReadyCount,
      playerShotScale: this.loadout.playerShotScale,
      upgradeOffer: this.loadout.offer,
      loadout: this.loadout.cards,
      upgradeOrder: this.loadout.upgradeOrder,
      cycle: this.cycle.view,
      recoveryBand: this.recoveryBand,
    };
  }

  private autoFire(events: DomainEvent[]): void {
    if (!this.viperFires || !this.viper.canFight) return;
    this.fireCooldownSeconds -= TICK_SECONDS;
    if (this.fireCooldownSeconds > 0) return;
    if (this.liveCount('player') >= MAX_PLAYER_SHOTS) return;

    const shot = this.obtainShot();
    if (!shot) return;

    const x = this.viper.x;
    const y = this.viper.y - VIPER_HALF_HEIGHT_UNITS * this.loadout.viperScale;
    shot.revive(
      this.nextId,
      x,
      y,
      0,
      -this.loadout.playerShotSpeed,
      'player',
      this.loadout.playerPierce,
    );
    this.nextId += 1;
    this.liveShots.push(shot);
    this.fireCooldownSeconds = this.loadout.fireIntervalSeconds;
    events.push({ type: 'ShotFired', id: shot.id, x, y, owner: 'player' });
  }

  /**
   * One missile per rising edge, so a held Space cannot dump the rack (PRD 8.2). Pointer and the
   * on-screen button already latch; the domain still edges so a keyboard hold is safe. The edge is
   * tracked every tick, including Recovering, so a hold across the jump is not a free launch.
   */
  private noteMissilePress(intent: InputIntent): boolean {
    const rising = intent.missile && !this.missileHeld;
    this.missileHeld = intent.missile;
    return rising;
  }

  private noteSpecialPress(intent: InputIntent): boolean {
    const rising = intent.special && !this.specialHeld;
    this.specialHeld = intent.special;
    return rising;
  }

  private maybeStartSpeech(rising: boolean, events: DomainEvent[]): void {
    if (!rising || !this.viper.canFight) return;
    if (!this.speech.tryStart()) return;
    events.push({ type: 'SpeechStarted' });
  }

  private maybeFireMissile(rising: boolean, events: DomainEvent[]): void {
    if (!rising || !this.viper.canFight) return;

    const missile = this.obtainMissile();
    if (!missile) return;
    if (!this.viper.trySpendMissile()) return;

    const lock = pickMissileLock(
      this.viper.x,
      this.viper.y,
      this.lockCandidates(),
      this.preferredMissileLockId(),
    );
    const x = this.viper.x;
    const y = this.viper.y - VIPER_HALF_HEIGHT_UNITS * this.loadout.viperScale;
    const speed = this.loadout.missileSpeed;
    let velocityX = 0;
    let velocityY = -speed;
    if (lock) {
      const deltaX = lock.x - x;
      const deltaY = lock.y - y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      velocityX = (deltaX / distance) * speed;
      velocityY = (deltaY / distance) * speed;
    }
    missile.revive(this.nextId, x, y, velocityX, velocityY, lock?.id ?? null);
    this.nextId += 1;
    this.liveMissiles.push(missile);
    events.push({ type: 'MissileFired', id: missile.id, x, y });
  }

  private obtainMissile(): Missile | null {
    const recycled = this.missiles.find((missile) => !missile.alive);
    if (recycled) return recycled;
    if (this.missiles.length >= MAX_MISSILES) return null;
    const created = new Missile();
    this.missiles.push(created);
    return created;
  }

  private lockCandidates(): LockCandidate[] {
    const candidates: LockCandidate[] = [];
    for (const raider of this.raiders) {
      if (raider.isProtected) continue;
      candidates.push({ id: raider.id, x: raider.x, y: raider.y });
    }
    const ship = this.resurrectionShip;
    if (ship && !ship.isDestroyed) {
      candidates.push({ id: RESURRECTION_SHIP_LOCK_ID, x: ship.x, y: ship.y });
    }
    return candidates;
  }

  private lockView(): GameView['missileLock'] {
    const lock = pickMissileLock(
      this.viper.x,
      this.viper.y,
      this.lockCandidates(),
      this.preferredMissileLockId(),
    );
    if (!lock) return null;
    const previous = this.lockPreviousPose(lock.id);
    return {
      id: lock.id,
      x: lock.x,
      y: lock.y,
      previousX: previous?.x ?? lock.x,
      previousY: previous?.y ?? lock.y,
    };
  }

  private lockPreviousPose(id: number): { x: number; y: number } | null {
    if (id === RESURRECTION_SHIP_LOCK_ID) {
      const ship = this.resurrectionShip;
      if (!ship) return null;
      const view = ship.toView();
      return { x: view.previousX, y: view.previousY };
    }
    const raider = this.raiders.find((body) => body.id === id);
    if (!raider) return null;
    const view = raider.toView();
    return { x: view.previousX, y: view.previousY };
  }

  private preferredMissileLockId(): number | null {
    if (!this.loadout.missilesPreferShip) return null;
    const ship = this.resurrectionShip;
    if (!ship || ship.isDestroyed) return null;
    return RESURRECTION_SHIP_LOCK_ID;
  }

  private poseForMissileTarget(id: number | null): { x: number; y: number } | null {
    if (id === null) return null;
    if (id === RESURRECTION_SHIP_LOCK_ID) {
      const ship = this.resurrectionShip;
      if (!ship || ship.isDestroyed) return null;
      return { x: ship.x, y: ship.y };
    }
    const raider = this.raiders.find((body) => body.id === id);
    if (!raider) return null;
    return { x: raider.x, y: raider.y };
  }

  private assignAttackTokens(): void {
    for (const raider of this.raiders) raider.setArmed(false);
    if (this.speech.isActive || !this.raidersFire || !this.viper.canFight) return;

    const viperX = this.viper.x;
    const viperY = this.viper.y;
    const ranked = this.raiders
      .filter((raider) => raider.y < viperY)
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.x - viperX, left.y - viperY);
        const rightDistance = Math.hypot(right.x - viperX, right.y - viperY);
        return leftDistance - rightDistance || left.id - right.id;
      });

    for (const raider of ranked.slice(0, ATTACK_TOKENS)) raider.setArmed(true);
  }

  private assignStrafeTokens(): void {
    for (const raider of this.raiders) raider.setStrafing(false);
    const viperX = this.viper.x;
    const viperY = this.viper.y;
    const ranked = [...this.raiders].sort((left, right) => {
      const leftDistance = Math.hypot(left.x - viperX, left.y - viperY);
      const rightDistance = Math.hypot(right.x - viperX, right.y - viperY);
      return rightDistance - leftDistance || left.id - right.id;
    });
    for (const raider of ranked.slice(0, STRAFE_TOKENS)) raider.setStrafing(true);
  }

  private raiderFire(events: DomainEvent[]): void {
    if (this.speech.isActive || !this.raidersFire || !this.viper.canFight) return;

    for (const raider of this.raiders) {
      if (!raider.isArmed || !raider.readyToFire) continue;
      if (this.liveCount('cylon') >= MAX_CYLON_SHOTS) return;

      const shot = this.obtainShot();
      if (!shot) return;

      const x = raider.x;
      const y = raider.y + RAIDER_HALF_HEIGHT_UNITS;
      const deltaX = this.viper.x - x;
      const deltaY = this.viper.y - y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      shot.revive(
        this.nextId,
        x,
        y,
        (deltaX / distance) * RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
        (deltaY / distance) * RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
        'cylon',
      );
      this.nextId += 1;
      this.liveShots.push(shot);
      raider.spentShot();
      events.push({ type: 'ShotFired', id: shot.id, x, y, owner: 'cylon' });
    }
  }

  private obtainShot(): Projectile | null {
    const recycled = this.shots.find((shot) => !shot.alive);
    if (recycled) return recycled;
    if (this.shots.length >= MAX_PLAYER_SHOTS + MAX_CYLON_SHOTS) return null;
    const created = new Projectile();
    this.shots.push(created);
    return created;
  }

  private liveCount(owner: 'player' | 'cylon'): number {
    let count = 0;
    for (const shot of this.liveShots) {
      if (shot.owner === owner) count += 1;
    }
    return count;
  }

  private advanceShots(): void {
    for (const shot of this.liveShots) {
      shot.advance(TICK_SECONDS);
      shot.becomeStrayIfPast(this.viper.y);
    }
  }

  private advanceMissiles(): void {
    for (const missile of this.liveMissiles) {
      const target = this.poseForMissileTarget(missile.targetId);
      if (target) missile.advance(TICK_SECONDS, target.x, target.y);
      else missile.advance(TICK_SECONDS);
    }
  }

  private advanceRaiders(events: DomainEvent[]): void {
    if (this.speech.isActive) {
      for (const raider of this.raiders) raider.holdStation();
      return;
    }
    for (const raider of this.raiders) {
      raider.advance(TICK_SECONDS);
      if (raider.isStrafing && raider.crossedFleetLine(FLEET_LINE_Y_UNITS)) {
        const damage = this.fleet.takeStrafe(raider.x, this.loadout.fleetCycleDamageCap);
        if (damage > 0) {
          const fleet = this.fleet.view;
          events.push({
            type: 'FleetHit',
            damage,
            integrity: fleet.integrity,
            x: raider.x,
            shipId: fleet.lastHitShipId ?? 0,
            kind: 'strafe',
          });
        }
        raider.reappearAtTop();
        continue;
      }
      if (raider.hasLeftTheBottom) raider.reappearAtTop();
    }
  }

  private resolveHits(events: DomainEvent[]): void {
    this.resolvePlayerHits(events);
    this.resolveMissileHits(events);
    this.resolveCylonHits(events);
    this.resolveFleetHits(events);
    this.dropDeadShots();
    this.dropDeadMissiles();
  }

  private resolvePlayerHits(events: DomainEvent[]): void {
    for (const shot of this.liveShots) {
      if (!shot.alive || shot.owner !== 'player') continue;
      const view = shot.toView();

      let hitRaider = false;
      for (let index = 0; index < this.raiders.length; index++) {
        const raider = this.raiders[index];
        if (!raider) continue;
        // Spawn protection: shots pass through so a Returned is not a free kill.
        if (raider.isProtected) continue;
        const hit = movingCircleHits(
          view.previousX,
          view.previousY,
          view.x,
          view.y,
          this.loadout.playerShotRadius,
          raider.x,
          raider.y,
          this.raiderRadius,
        );
        if (!hit) continue;

        hitRaider = true;
        if (raider.takeHit()) {
          this.destroyRaider(raider, events);
          index -= 1;
        }
        if (!shot.tryPierce()) {
          shot.kill();
          break;
        }
      }
      if (hitRaider) continue;
      if (this.tryDelayGhost(shot, view, events)) continue;
      const ship = this.resurrectionShip;
      if (!ship || ship.isDestroyed) continue;
      const hitsShip = movingCircleHits(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        this.loadout.playerShotRadius,
        ship.x,
        ship.y,
        RESURRECTION_SHIP_RADIUS_UNITS,
      );
      if (!hitsShip) continue;
      shot.kill();
      if (ship.takeHit(this.loadout.shipDamage(1, ship.baysOpen))) {
        events.push({ type: 'ResurrectionShipDestroyed', x: ship.x, y: ship.y });
      }
    }
  }

  /**
   * The one way a Raider dies, whatever killed it: the fact goes out, the soul queues a download
   * while the resurrection ship lives (PRD 6), and the body leaves the swarm.
   */
  private destroyRaider(raider: Raider, events: DomainEvent[]): void {
    events.push({ type: 'RaiderDestroyed', id: raider.id, x: raider.x, y: raider.y });
    if (!this.resurrectionShip?.isDestroyed) {
      this.downloads.push(
        new Download(raider.identityId, raider.deaths + 1, raider.x, raider.y, this.loadout.downloadSeconds),
      );
    }
    const index = this.raiders.indexOf(raider);
    if (index >= 0) this.raiders.splice(index, 1);
    this.kills += 1;
  }

  /**
   * *Spoilers*: a gun hit on a blip delays that download. Live Raiders soak first so the killing
   * round is not a free delay. Missiles ignore ghosts (a delay is not worth the rack).
   */
  private tryDelayGhost(
    shot: Projectile,
    view: { readonly previousX: number; readonly previousY: number; readonly x: number; readonly y: number },
    events: DomainEvent[],
  ): boolean {
    const delaySeconds = this.loadout.ghostDelaySeconds;
    if (delaySeconds <= 0) return false;

    const ghostY = this.raiderSpawnY;
    let bestAlong = Infinity;
    let best: Download | null = null;
    for (const download of this.downloads) {
      const along = movingCircleHitAlong(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        this.loadout.playerShotRadius,
        download.x,
        ghostY,
        GHOST_RADIUS_UNITS,
      );
      if (along === null) continue;
      if (along < bestAlong || (along === bestAlong && download.identityId < (best?.identityId ?? Infinity))) {
        bestAlong = along;
        best = download;
      }
    }
    if (!best) return false;

    best.delay(delaySeconds);
    events.push({
      type: 'GhostDelayed',
      identityId: best.identityId,
      remainingSeconds: best.remaining,
      x: best.x,
      y: ghostY,
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
  private resolveMissileHits(events: DomainEvent[]): void {
    for (const missile of this.liveMissiles) {
      if (!missile.alive) continue;
      const view = missile.toView();

      let bestAlong = Infinity;
      let bestId = Infinity;
      let hitRaider: Raider | null = null;
      let hitShip = false;

      for (const raider of this.raiders) {
        if (raider.isProtected) continue;
        const along = movingCircleHitAlong(
          view.previousX,
          view.previousY,
          view.x,
          view.y,
          MISSILE_RADIUS_UNITS,
          raider.x,
          raider.y,
          this.raiderRadius,
        );
        if (along === null) continue;
        if (along < bestAlong || (along === bestAlong && raider.id < bestId)) {
          bestAlong = along;
          bestId = raider.id;
          hitRaider = raider;
          hitShip = false;
        }
      }

      const ship = this.resurrectionShip;
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
        if (
          along !== null &&
          (along < bestAlong || (along === bestAlong && RESURRECTION_SHIP_LOCK_ID < bestId))
        ) {
          hitRaider = null;
          hitShip = true;
        }
      }

      if (!hitRaider && !hitShip) continue;
      missile.kill();
      if (hitRaider?.takeHit(MISSILE_RAIDER_DAMAGE)) this.destroyRaider(hitRaider, events);
      if (hitShip && ship?.takeHit(this.loadout.shipDamage(MISSILE_SHIP_DAMAGE, ship.baysOpen))) {
        events.push({ type: 'ResurrectionShipDestroyed', x: ship.x, y: ship.y });
      }
    }
  }

  private resolveCylonHits(events: DomainEvent[]): void {
    const speechActive = this.speech.isActive;
    if (!speechActive && !this.viper.isVulnerable) return;

    for (const shot of this.liveShots) {
      if (!shot.alive || shot.owner !== 'cylon') continue;
      const view = shot.toView();
      const hit = movingCircleHits(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        RAIDER_SHOT_RADIUS_UNITS,
        this.viper.x,
        this.viper.y,
        this.loadout.viperRadius * this.playfield.fighterScale,
      );
      if (!hit) continue;

      shot.kill();
      // ASSUMPTION: The Speech eats rounds that hit the Viper so they do not become fleet strays.
      if (speechActive) continue;
      if (this.viper.takeHit()) {
        if (this.loadout.tryCylonSave()) {
          this.viper.absorbDownload(CYLON_SAVE_INVULN_SECONDS);
          events.push({ type: 'ViperDownloaded', x: this.viper.x, y: this.viper.y });
          return;
        }
        events.push({ type: 'ViperEjected', x: this.viper.x, y: this.viper.y });
        return;
      }
    }
  }

  private resolveFleetHits(events: DomainEvent[]): void {
    for (const shot of this.liveShots) {
      if (!shot.alive || !shot.crossedFleetLine(FLEET_LINE_Y_UNITS)) continue;
      const x = shot.toView().x;
      shot.kill();
      if (this.tryRaptorSoak(x, events)) continue;
      const chance = this.loadout.flakInterceptChance;
      // No roll when chance is 0, so a run without the card does not spend scenario RNG (D3).
      if (chance > 0 && this.scenario.next() < chance) {
        events.push({ type: 'FlakIntercepted', x, y: FLEET_LINE_Y_UNITS });
        continue;
      }
      const damage = this.fleet.takeStray(x, this.loadout.fleetCycleDamageCap);
      if (damage > 0) {
        const fleet = this.fleet.view;
        events.push({
          type: 'FleetHit',
          damage,
          integrity: fleet.integrity,
          x,
          shipId: fleet.lastHitShipId ?? 0,
          kind: 'stray',
        });
      }
    }
  }

  /** One escort per stack, full hull, spread along the line. Hangared ones relaunch next cycle. */
  private launchRaptors(): void {
    const count = this.loadout.raptorCount;
    this.raptors = [];
    for (let index = 0; index < count; index++) {
      this.raptors.push(
        new Raptor(index, raptorLaunchX(index, count, this.playfield.width), index % 2 === 0 ? 1 : -1, this.playfield.width),
      );
    }
  }

  private advanceRaptors(): void {
    for (const raptor of this.raptors) raptor.advance(TICK_SECONDS);
  }

  private syncSix(): void {
    if (this.loadout.hasImaginarySix) this.six ??= new ImaginarySix(this.playfield.width);
    else this.six = null;
  }

  /**
   * Fleet-defense beam: strafing Raiders first, then stray rounds, in range only. She does not
   * shoot parked Raiders or the factory (PRD 10.3).
   */
  private fireSix(events: DomainEvent[]): void {
    if (!this.six?.isPresent) return;
    this.six.advance(TICK_SECONDS);
    const target = this.pickSixTarget();
    if (!target) {
      this.six.clearAim();
      return;
    }
    this.six.pointAt(target.x, target.y);
    if (!this.six.readyToFire) return;
    this.six.spentShot();
    events.push({
      type: 'SixFired',
      x: this.six.x,
      y: this.six.y,
      targetX: target.x,
      targetY: target.y,
      kind: target.kind,
    });
    if (target.kind === 'stray') {
      target.shot.kill();
      events.push({ type: 'SixIntercepted', x: target.x, y: target.y });
      return;
    }
    if (target.raider.takeHit(SIX_DAMAGE)) this.destroyRaider(target.raider, events);
  }

  private pickSixTarget():
    | { readonly kind: 'strafe'; readonly raider: Raider; readonly x: number; readonly y: number }
    | { readonly kind: 'stray'; readonly shot: Projectile; readonly x: number; readonly y: number }
    | null {
    const six = this.six;
    if (!six) return null;

    let bestStrafe: Raider | null = null;
    for (const raider of this.raiders) {
      if (!raider.isStrafing || raider.isProtected) continue;
      if (!six.inRange(raider.x, raider.y)) continue;
      if (!bestStrafe || raider.y > bestStrafe.y || (raider.y === bestStrafe.y && raider.id < bestStrafe.id)) {
        bestStrafe = raider;
      }
    }
    if (bestStrafe) return { kind: 'strafe', raider: bestStrafe, x: bestStrafe.x, y: bestStrafe.y };

    let bestShot: Projectile | null = null;
    for (const shot of this.liveShots) {
      if (!shot.alive || shot.owner !== 'cylon' || !shot.isStray) continue;
      if (!six.inRange(shot.x, shot.y)) continue;
      if (!bestShot || shot.y > bestShot.y || (shot.y === bestShot.y && shot.id < bestShot.id)) {
        bestShot = shot;
      }
    }
    if (bestShot) return { kind: 'stray', shot: bestShot, x: bestShot.x, y: bestShot.y };
    return null;
  }

  /**
   * A stray that lands on a Raptor is eaten. Nearest escort on a tie. Strafes are not soaked
   * (PRD 10.2).
   */
  private tryRaptorSoak(x: number, events: DomainEvent[]): boolean {
    let best: Raptor | null = null;
    let bestDistance = Infinity;
    for (const raptor of this.raptors) {
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

  private reclaimShotsThatLeft(): void {
    for (const shot of this.liveShots) {
      if (shot.hasLeftTheWorld) shot.kill();
    }
    this.dropDeadShots();
  }

  private reclaimMissilesThatLeft(): void {
    for (const missile of this.liveMissiles) {
      if (missile.hasLeftTheWorld) missile.kill();
    }
    this.dropDeadMissiles();
  }

  private dropDeadShots(): void {
    let write = 0;
    for (let read = 0; read < this.liveShots.length; read++) {
      const shot = this.liveShots[read];
      if (shot?.alive) {
        this.liveShots[write] = shot;
        write += 1;
      }
    }
    this.liveShots.length = write;
  }

  private dropDeadMissiles(): void {
    let write = 0;
    for (let read = 0; read < this.liveMissiles.length; read++) {
      const missile = this.liveMissiles[read];
      if (missile?.alive) {
        this.liveMissiles[write] = missile;
        write += 1;
      }
    }
    this.liveMissiles.length = write;
  }

  /**
   * Jumping clears live fire and the Raider that was in this sector. That is not a kill: the
   * body left with the fleet. Pending downloads finish in transit and arrive first next cycle.
   */
  private clearTheSky(events: DomainEvent[]): void {
    if (this.liveShots.length > 0 || this.liveMissiles.length > 0) {
      for (const shot of this.liveShots) shot.kill();
      this.dropDeadShots();
      for (const missile of this.liveMissiles) missile.kill();
      this.dropDeadMissiles();
      events.push({ type: 'ShotsCleared' });
    }
    if (this.resurrectionShip?.isDestroyed) {
      for (const raider of this.raiders) {
        this.downloads.push(
          new Download(raider.identityId, raider.deaths, raider.x, raider.y, this.loadout.downloadSeconds),
        );
      }
    }
    this.raiders.length = 0;
    for (const download of this.downloads) download.arriveNow();
  }

  private advanceDownloads(): void {
    for (const download of this.downloads) download.advance(TICK_SECONDS);
  }

  /**
   * Keeps live Raiders at the Director cap. Ready downloads come back first; each pending
   * download reserves one slot so a refill cannot add pressure (PRD 6).
   */
  private fillTheSwarm(events: DomainEvent[]): void {
    const shipGone = this.resurrectionShip?.isDestroyed === true;
    while (this.raiders.length < DIRECTOR_CAP) {
      const readyIndex = this.downloads.findIndex((download) => download.isReady);
      if (readyIndex >= 0) {
        const ready = this.downloads[readyIndex];
        if (!ready) return;
        this.downloads.splice(readyIndex, 1);
        this.spawnRaider(events, {
          identityId: ready.identityId,
          deaths: ready.deaths,
          x: ready.x,
        });
        continue;
      }

      if (shipGone) return;
      if (this.raiders.length + this.downloads.length >= DIRECTOR_CAP) return;
      this.spawnRaider(events);
    }
  }

  private maybeArriveShip(events: DomainEvent[]): void {
    if (this.resurrectionShip) return;
    if (this.cycle.view.cycleIndex < this.resurrectionShipArrivesCycle) return;
    const shielded = this.cycle.view.cycleIndex < this.resurrectionShipVulnerableCycle;
    this.resurrectionShip = new ResurrectionShip(this.resurrectionShipHitPoints, shielded, this.playfield.width);
    events.push({ type: 'ResurrectionShipArrived', x: this.resurrectionShip.x, y: this.resurrectionShip.y });
  }

  private maybeExposeShip(events: DomainEvent[]): void {
    const ship = this.resurrectionShip;
    if (!ship?.isShielded) return;
    if (this.cycle.view.cycleIndex < this.resurrectionShipVulnerableCycle) return;
    if (!ship.expose()) return;
    events.push({ type: 'ResurrectionShipExposed', x: ship.x, y: ship.y });
  }

  private maybeLose(events: DomainEvent[]): void {
    if (this.runLost || this.runWon) return;
    if (this.fleet.view.integrity > 0) return;
    this.runLost = true;
    events.push({ type: 'RunLost' });
  }

  private maybeWin(events: DomainEvent[]): void {
    if (this.runWon || this.runLost) return;
    if (!this.resurrectionShip?.isDestroyed) return;
    if (this.raiders.length > 0 || this.downloads.length > 0) return;
    this.runWon = true;
    events.push({ type: 'RunWon' });
  }

  private spawnRaider(
    events: DomainEvent[],
    returning?: { readonly identityId: number; readonly deaths: number; readonly x: number },
  ): void {
    if (this.raiders.length >= DIRECTOR_CAP) return;
    const minX = raiderSpawnMinX(this.playfield.fighterScale);
    const maxX = raiderSpawnMaxX(this.playfield.width, this.playfield.fighterScale);
    const column = returning?.x ?? this.pickFreshColumn(minX, maxX);
    const x = Math.min(maxX, Math.max(minX, column));
    const identityId = returning?.identityId ?? this.nextIdentityId;
    if (!returning) this.nextIdentityId += 1;

    const raider = new Raider(this.nextId, identityId, x, this.raiderSpawnY, {
      deaths: returning?.deaths ?? 0,
      returned: Boolean(returning),
    });
    this.nextId += 1;
    this.raiders.push(raider);
    events.push({
      type: 'RaiderSpawned',
      id: raider.id,
      identityId: raider.identityId,
      x: raider.x,
      y: raider.y,
      returned: raider.returned,
      deaths: raider.deaths,
    });
  }

  private get raiderRadius(): number {
    return RAIDER_RADIUS_UNITS * this.playfield.fighterScale;
  }

  private get raiderSpawnY(): number {
    return RAIDER_HALF_HEIGHT_UNITS * this.playfield.fighterScale + 8;
  }

  private pickFreshColumn(minX: number, maxX: number): number {
    const gap = RAIDER_HALF_WIDTH_UNITS * this.playfield.fighterScale * 4;
    for (let attempt = 0; attempt < 8; attempt++) {
      const x = this.scenario.between(minX, maxX);
      if (this.raiders.every((raider) => Math.abs(raider.x - x) >= gap)) return x;
    }
    return this.scenario.between(minX, maxX);
  }
}

/**
 * Creates a game. This is the seam the headless balance harness will use (ADR-0001 D13): it takes
 * no browser, no engine, and no clock. The scenario seed decides where the first Raider appears;
 * a combat stream arrives with aim error and drops in later slices.
 */
export function createGame(options: GameOptions = {}): Game {
  return new Game(options);
}
