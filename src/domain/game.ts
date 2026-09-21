import { JumpCycle } from './cycle/jumpCycle';
import { Viper, VIPER_HALF_HEIGHT_UNITS, VIPER_RADIUS_UNITS } from './combat/viper';
import {
  MAX_CYLON_SHOTS,
  MAX_PLAYER_SHOTS,
  Projectile,
  RAIDER_SHOT_RADIUS_UNITS,
  RAIDER_SHOT_SPEED_UNITS_PER_SECOND,
  VIPER_FIRE_INTERVAL_SECONDS,
  VIPER_SHOT_RADIUS_UNITS,
  VIPER_SHOT_SPEED_UNITS_PER_SECOND,
} from './combat/projectile';
import type { DomainEvent } from './shared/events';
import { movingCircleHits } from './shared/collision';
import type { InputIntent } from './shared/intent';
import { createRandomStream, type RandomStream } from './shared/random';
import { TICK_SECONDS } from './shared/time';
import {
  Raider,
  RAIDER_HALF_HEIGHT_UNITS,
  RAIDER_HALF_WIDTH_UNITS,
  RAIDER_RADIUS_UNITS,
  RAIDER_SPAWN_Y_UNITS,
  raiderSpawnMaxX,
  raiderSpawnMinX,
} from './swarm/raider';
import { Fleet, FLEET_INTEGRITY_MAX, FLEET_LINE_Y_UNITS } from './fleet/integrity';
import { ATTACK_TOKENS, DIRECTOR_CAP, Download, STRAFE_TOKENS } from './swarm/resurrection';
import {
  ResurrectionShip,
  RESURRECTION_SHIP_ARRIVES_CYCLE,
  RESURRECTION_SHIP_HIT_POINTS,
  RESURRECTION_SHIP_RADIUS_UNITS,
  RESURRECTION_SHIP_VULNERABLE_CYCLE,
} from './swarm/resurrectionShip';
import type { GameView } from './views';

/** Seed used when the caller does not pass one. Play uses this until a run-start seed exists. */
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
   * Starting Fleet Integrity. Play uses 100. Tests can start near the floor so a dive can end
   * the run; Civilian Ship numbers cannot reach zero in a normal cycle (PRD 7.2).
   */
  readonly fleetStartingIntegrity?: number;
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
  private readonly resurrectionShipArrivesCycle: number;
  private readonly resurrectionShipVulnerableCycle: number;
  private readonly resurrectionShipHitPoints: number;
  private readonly cycle = new JumpCycle();
  private readonly fleet: Fleet;
  private readonly viper = new Viper();
  private readonly shots: Projectile[] = [];
  private readonly liveShots: Projectile[] = [];
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

  constructor(options: GameOptions = {}) {
    const seed = options.seed ?? DEFAULT_RUN_SEED;
    this.scenario = createRandomStream(seed);
    this.station = createRandomStream((seed ^ 0x51ed) >>> 0);
    this.raidersFire = options.raidersFire ?? true;
    this.resurrectionShipArrivesCycle = options.resurrectionShipArrivesCycle ?? RESURRECTION_SHIP_ARRIVES_CYCLE;
    const vulnerable = options.resurrectionShipVulnerableCycle ?? RESURRECTION_SHIP_VULNERABLE_CYCLE;
    this.resurrectionShipVulnerableCycle = Math.max(this.resurrectionShipArrivesCycle, vulnerable);
    this.resurrectionShipHitPoints = options.resurrectionShipHitPoints ?? RESURRECTION_SHIP_HIT_POINTS;
    this.fleet = new Fleet(options.fleetStartingIntegrity ?? FLEET_INTEGRITY_MAX);
  }

  /** Advances the simulation by exactly one tick. The only way to change domain state. */
  tick(intent: InputIntent): readonly DomainEvent[] {
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
        this.fleet.repairAtJump();
        events.push({ type: 'FleetRepaired', integrity: this.fleet.view.integrity });
      }
    }

    this.maybeArriveShip(events);
    this.maybeExposeShip(events);
    this.resurrectionShip?.advance(TICK_SECONDS, this.station);

    this.viper.steer(intent.moveX, intent.moveY, TICK_SECONDS);
    if (this.viper.isReadyForPickup) {
      this.viper.recoverFromEject();
      events.push({ type: 'ViperRecovered', x: this.viper.x, y: this.viper.y });
    }

    if (this.cycle.isInCombat) {
      this.fillTheSwarm(events);
      this.assignAttackTokens();
      this.assignStrafeTokens();
      this.autoFire(events);
      this.raiderFire(events);
      this.advanceShots();
      this.advanceRaiders(events);
      this.resolveHits(events);
      this.reclaimShotsThatLeft();
      this.advanceDownloads();
      this.fillTheSwarm(events);
    }

    this.ticks += 1;
    this.maybeLose(events);
    this.maybeWin(events);
    return events;
  }

  /**
   * Leaves Recovering for the next cycle. The only way Recovering ends: there is no timer on this
   * decision (PRD 5.1).
   */
  continueFromJump(): readonly DomainEvent[] {
    const change = this.cycle.continueFromJump();
    if (!change) return [];
    const events: DomainEvent[] = [change];
    this.viper.resetAtJump();
    this.maybeArriveShip(events);
    this.maybeExposeShip(events);
    this.fillTheSwarm(events);
    return events;
  }

  /** A read-only snapshot for presenters. Cheap: it reads live state, it does not copy aggregates. */
  get view(): GameView {
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
        ejected: viper.isEjected,
      },
      projectiles: this.liveShots.map((shot) => shot.toView()),
      raiders: this.raiders.map((raider) => raider.toView()),
      ghosts: this.downloads.map((download) => ({
        identityId: download.identityId,
        deaths: download.deaths,
        x: download.x,
        y: download.y,
        remainingSeconds: download.remaining,
      })),
      fleet: this.fleet.view,
      resurrectionShip: this.resurrectionShip?.toView() ?? null,
      resurrectionsActive: this.resurrectionShip?.isDestroyed !== true,
      cycle: this.cycle.view,
    };
  }

  private autoFire(events: DomainEvent[]): void {
    if (!this.viper.canFight) return;
    this.fireCooldownSeconds -= TICK_SECONDS;
    if (this.fireCooldownSeconds > 0) return;
    if (this.liveCount('player') >= MAX_PLAYER_SHOTS) return;

    const shot = this.obtainShot();
    if (!shot) return;

    const x = this.viper.x;
    const y = this.viper.y - VIPER_HALF_HEIGHT_UNITS;
    shot.revive(this.nextId, x, y, 0, -VIPER_SHOT_SPEED_UNITS_PER_SECOND, 'player');
    this.nextId += 1;
    this.liveShots.push(shot);
    this.fireCooldownSeconds = VIPER_FIRE_INTERVAL_SECONDS;
    events.push({ type: 'ShotFired', id: shot.id, x, y, owner: 'player' });
  }

  private assignAttackTokens(): void {
    for (const raider of this.raiders) raider.setArmed(false);
    if (!this.raidersFire || !this.viper.canFight) return;

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
    if (!this.raidersFire || !this.viper.canFight) return;

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

  private advanceRaiders(events: DomainEvent[]): void {
    for (const raider of this.raiders) {
      raider.advance(TICK_SECONDS);
      if (raider.isStrafing && raider.crossedFleetLine(FLEET_LINE_Y_UNITS)) {
        const damage = this.fleet.takeStrafe(raider.x);
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
    this.resolveCylonHits(events);
    this.resolveFleetHits(events);
    this.dropDeadShots();
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
          VIPER_SHOT_RADIUS_UNITS,
          raider.x,
          raider.y,
          RAIDER_RADIUS_UNITS,
        );
        if (!hit) continue;

        hitRaider = true;
        shot.kill();
        if (raider.takeHit()) {
          events.push({ type: 'RaiderDestroyed', id: raider.id, x: raider.x, y: raider.y });
          if (!this.resurrectionShip?.isDestroyed) {
            this.downloads.push(new Download(raider.identityId, raider.deaths + 1, raider.x, raider.y));
          }
          this.raiders.splice(index, 1);
          this.kills += 1;
        }
        break;
      }
      if (hitRaider) continue;
      const ship = this.resurrectionShip;
      if (!ship || ship.isDestroyed) continue;
      const hitsShip = movingCircleHits(
        view.previousX,
        view.previousY,
        view.x,
        view.y,
        VIPER_SHOT_RADIUS_UNITS,
        ship.x,
        ship.y,
        RESURRECTION_SHIP_RADIUS_UNITS,
      );
      if (!hitsShip) continue;
      shot.kill();
      if (ship.takeHit()) {
        events.push({ type: 'ResurrectionShipDestroyed', x: ship.x, y: ship.y });
      }
    }
  }

  private resolveCylonHits(events: DomainEvent[]): void {
    if (!this.viper.isVulnerable) return;

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
        VIPER_RADIUS_UNITS,
      );
      if (!hit) continue;

      shot.kill();
      if (this.viper.takeHit()) {
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
      const damage = this.fleet.takeStray(x);
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

  private reclaimShotsThatLeft(): void {
    for (const shot of this.liveShots) {
      if (shot.hasLeftTheWorld) shot.kill();
    }
    this.dropDeadShots();
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

  /**
   * Jumping clears live fire and the Raider that was in this sector. That is not a kill: the
   * body left with the fleet. Pending downloads finish in transit and arrive first next cycle.
   */
  private clearTheSky(events: DomainEvent[]): void {
    if (this.liveShots.length > 0) {
      for (const shot of this.liveShots) shot.kill();
      this.dropDeadShots();
      events.push({ type: 'ShotsCleared' });
    }
    if (this.resurrectionShip?.isDestroyed) {
      for (const raider of this.raiders) {
        this.downloads.push(new Download(raider.identityId, raider.deaths, raider.x, raider.y));
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
    this.resurrectionShip = new ResurrectionShip(this.resurrectionShipHitPoints, shielded);
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
    const minX = raiderSpawnMinX();
    const maxX = raiderSpawnMaxX();
    const column = returning?.x ?? this.pickFreshColumn(minX, maxX);
    const x = Math.min(maxX, Math.max(minX, column));
    const identityId = returning?.identityId ?? this.nextIdentityId;
    if (!returning) this.nextIdentityId += 1;

    const raider = new Raider(this.nextId, identityId, x, RAIDER_SPAWN_Y_UNITS, {
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

  private pickFreshColumn(minX: number, maxX: number): number {
    const gap = RAIDER_HALF_WIDTH_UNITS * 4;
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
