import { damageBand, type DamageBand } from './cycle/damageBand';
import { JumpCycle } from './cycle/jumpCycle';
import { Viper, VIPER_HALF_HEIGHT_UNITS, VIPER_HULL_HIT_POINTS } from './combat/viper';
import { MAX_CYLON_SHOTS, MAX_PLAYER_SHOTS, RAIDER_SHOT_SPEED_UNITS_PER_SECOND } from './combat/projectile';
import { MISSILE_CAPACITY, RESURRECTION_SHIP_LOCK_ID } from './combat/missile';
import { Munitions } from './combat/Munitions';
import { fireSix, resolveHits, type Battlefield } from './combat/hits';
import { pickMissileLock, type LockCandidate } from './combat/targeting';
import { Speech } from './combat/speech';
import { ImaginarySix } from './combat/imaginarySix';
import type { CardId } from './progression/catalog';
import { Loadout } from './progression/loadout';
import type { DomainEvent } from './shared/events';
import type { InputIntent } from './shared/intent';
import { createRandomStream, type RandomStream } from './shared/random';
import { TICK_SECONDS } from './shared/time';
import type { Raider } from './swarm/raider';
import { RAIDER_HALF_HEIGHT_UNITS } from './swarm/raider';
import { Swarm } from './swarm/Swarm';
import type { CycleProfile } from './balance/profile';
import { Fleet, FLEET_CYCLE_DAMAGE_CAP, FLEET_INTEGRITY_MAX, FLEET_LINE_Y_UNITS, FLEET_REPAIR_OF_MISSING } from './fleet/integrity';
import { Raptor, raptorLaunchX } from './fleet/raptor';
import {
  ResurrectionShip,
  RESURRECTION_SHIP_ARRIVES_CYCLE,
  RESURRECTION_SHIP_HIT_POINTS,
  RESURRECTION_SHIP_VULNERABLE_CYCLE,
} from './swarm/resurrectionShip';
import type { GameView } from './views';
import { PHONE_PLAYFIELD, type Playfield } from './shared/world';

/**
 * Seed used when the caller does not pass one. Play draws a fresh seed per run (ADR-0001 D3); tests
 * pin one so a run repeats given the same inputs.
 */
export const DEFAULT_RUN_SEED = 1;

export interface GameOptions {
  /** Gameplay stream seed (ADR-0001 D3). With the same inputs, the same seed repeats the run. */
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
 *
 * `Game` owns the order of a tick and the run-level state. The rules live next to what they are
 * about: the swarm and Director in `Swarm`, pooled rounds in `Munitions`, and hit resolution in
 * `combat/hits` (ADR-0002 D4).
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
  private readonly munitions = new Munitions();
  private readonly swarm: Swarm;
  private resurrectionShip: ResurrectionShip | null = null;
  private runWon = false;
  private runLost = false;
  /** One id sequence for shots, missiles, and Raiders. Tie-breaks read it, so it is shared. */
  private nextId = 1;
  private ticks = 0;
  private fireCooldownSeconds = 0;
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
    this.swarm = new Swarm(this.playfield, this.scenario, () => this.allocateId());
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
      this.swarm.assignAttackTokens(
        this.viper.x,
        this.viper.y,
        !this.speech.isActive && this.raidersFire && this.viper.canFight,
      );
      this.swarm.assignStrafeTokens(this.viper.x, this.viper.y);
      this.autoFire(events);
      this.maybeFireMissile(missileRising, events);
      this.maybeStartSpeech(specialRising, events);
      this.raiderFire(events);
      this.munitions.advanceShots(TICK_SECONDS, this.viper.y);
      this.munitions.advanceMissiles(TICK_SECONDS, (id) => this.poseForMissileTarget(id));
      fireSix(this.battlefield(), TICK_SECONDS, events);
      this.advanceRaiders(events);
      for (const raptor of this.raptors) raptor.advance(TICK_SECONDS);
      resolveHits(this.battlefield(), events);
      this.munitions.reclaimShotsThatLeft();
      this.munitions.reclaimMissilesThatLeft();
      this.swarm.advanceDownloads(TICK_SECONDS);
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
      kills: this.swarm.kills,
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
      projectiles: this.munitions.shots.map((shot) => shot.toView()),
      missiles: this.munitions.missiles.map((missile) => missile.toView()),
      missileLock: this.lockView(),
      missileAmmo: this.viper.missileAmmo,
      missileAmmoMax: MISSILE_CAPACITY,
      raiders: this.swarm.raiders.map((raider) => raider.toView()),
      ghosts: this.swarm.downloads.map((download) => ({
        identityId: download.identityId,
        deaths: download.deaths,
        x: download.x,
        // Spoilers: sit on the return column at spawn height so you can see and shoot the future
        // (PRD 10.2). Without the card the bar stays on the corpse.
        y: this.loadout.ghostsAreShootable ? this.swarm.spawnY : download.y,
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

  private allocateId(): number {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  /** What a hit can touch right now. Built when needed, so the Speech, ship, and escorts are current. */
  private battlefield(): Battlefield {
    return {
      swarm: this.swarm,
      munitions: this.munitions,
      viper: this.viper,
      loadout: this.loadout,
      fleet: this.fleet,
      scenario: this.scenario,
      playfield: this.playfield,
      speechActive: this.speech.isActive,
      resurrectionShip: this.resurrectionShip,
      raptors: this.raptors,
      six: this.six,
      destroyRaider: (raider, events) => {
        this.destroyRaider(raider, events);
      },
    };
  }

  /** Every weapon kills the same way. The loop is on until the resurrection ship is destroyed. */
  private destroyRaider(raider: Raider, events: DomainEvent[]): void {
    this.swarm.destroy(raider, events, !this.resurrectionShip?.isDestroyed, this.loadout.downloadSeconds);
  }

  private fillTheSwarm(events: DomainEvent[]): void {
    this.swarm.fill(events, this.resurrectionShip?.isDestroyed === true);
  }

  private autoFire(events: DomainEvent[]): void {
    if (!this.viperFires || !this.viper.canFight) return;
    this.fireCooldownSeconds -= TICK_SECONDS;
    if (this.fireCooldownSeconds > 0) return;
    if (this.munitions.countShots('player') >= MAX_PLAYER_SHOTS) return;

    const shot = this.munitions.obtainShot();
    if (!shot) return;

    const x = this.viper.x;
    const y = this.viper.y - VIPER_HALF_HEIGHT_UNITS * this.loadout.viperScale;
    shot.revive(
      this.allocateId(),
      x,
      y,
      0,
      -this.loadout.playerShotSpeed,
      'player',
      this.loadout.playerPierce,
    );
    this.munitions.launchShot(shot);
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

    const missile = this.munitions.obtainMissile();
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
    missile.revive(this.allocateId(), x, y, velocityX, velocityY, lock?.id ?? null);
    this.munitions.launchMissile(missile);
    events.push({ type: 'MissileFired', id: missile.id, x, y });
  }

  private lockCandidates(): LockCandidate[] {
    const candidates: LockCandidate[] = [];
    for (const raider of this.swarm.raiders) {
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
    const raider = this.swarm.find(id);
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
    const raider = this.swarm.find(id);
    if (!raider) return null;
    return { x: raider.x, y: raider.y };
  }

  private raiderFire(events: DomainEvent[]): void {
    if (this.speech.isActive || !this.raidersFire || !this.viper.canFight) return;

    for (const raider of this.swarm.raiders) {
      if (!raider.isArmed || !raider.readyToFire) continue;
      if (this.munitions.countShots('cylon') >= MAX_CYLON_SHOTS) return;

      const shot = this.munitions.obtainShot();
      if (!shot) return;

      const x = raider.x;
      const y = raider.y + RAIDER_HALF_HEIGHT_UNITS;
      const deltaX = this.viper.x - x;
      const deltaY = this.viper.y - y;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      shot.revive(
        this.allocateId(),
        x,
        y,
        (deltaX / distance) * RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
        (deltaY / distance) * RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
        'cylon',
      );
      this.munitions.launchShot(shot);
      raider.spentShot();
      events.push({ type: 'ShotFired', id: shot.id, x, y, owner: 'cylon' });
    }
  }

  /** Raiders move. A strafer that reaches the line hits the fleet where it crossed (PRD 7.1). */
  private advanceRaiders(events: DomainEvent[]): void {
    this.swarm.advance(TICK_SECONDS, FLEET_LINE_Y_UNITS, this.speech.isActive, (raider) => {
      const damage = this.fleet.takeStrafe(raider.x, this.loadout.fleetCycleDamageCap);
      if (damage <= 0) return;
      const fleet = this.fleet.view;
      events.push({
        type: 'FleetHit',
        damage,
        integrity: fleet.integrity,
        x: raider.x,
        shipId: fleet.lastHitShipId ?? 0,
        kind: 'strafe',
      });
    });
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

  private syncSix(): void {
    if (this.loadout.hasImaginarySix) this.six ??= new ImaginarySix(this.playfield.width);
    else this.six = null;
  }

  /**
   * Jumping clears live fire and the Raiders that were in this sector. That is not a kill: the
   * bodies left with the fleet. Pending downloads finish in transit and arrive first next cycle.
   */
  private clearTheSky(events: DomainEvent[]): void {
    if (this.munitions.clearAll()) events.push({ type: 'ShotsCleared' });
    this.swarm.clearAtJump(this.resurrectionShip?.isDestroyed === true, this.loadout.downloadSeconds);
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
    if (!this.swarm.isClear) return;
    this.runWon = true;
    events.push({ type: 'RunWon' });
  }
}

/**
 * Creates a game. This is the seam the headless balance harness will use (ADR-0001 D13): it takes
 * no browser, no engine, and no clock.
 */
export function createGame(options: GameOptions = {}): Game {
  return new Game(options);
}
