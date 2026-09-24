import type { DomainEvent } from '../shared/events';
import type { RandomStream } from '../shared/random';
import type { Playfield } from '../shared/world';
import { movingCircleHitAlong } from '../shared/collision';
import {
  type FlightPattern,
  HEAVY_HALF_HEIGHT_UNITS,
  HEAVY_RADIUS_UNITS,
  Raider,
  SINE_AMPLITUDE_UNITS,
  RAIDER_HALF_HEIGHT_UNITS,
  RAIDER_HALF_WIDTH_UNITS,
  RAIDER_RADIUS_UNITS,
  raiderSpawnMaxX,
  raiderSpawnMinX,
} from './raider';
import { Download, GHOST_RADIUS_UNITS } from './resurrection';

/** This cycle's numbers from the tier profile (PRD 9). */
export interface SpawnRules {
  readonly cap: number;
  readonly floor: number;
  /** Share of new Raiders, 0 to 1, that weave instead of diving. */
  readonly sineShare: number;
}

/**
 * The live Raiders, the download queue, and the Director that keeps them at the cap (PRD 6, 9).
 * `Game` decides when each of these runs; this module decides what they do.
 */
export class Swarm {
  private readonly bodies: Raider[] = [];
  private readonly queue: Download[] = [];
  private nextIdentityId = 1;
  private killCount = 0;

  /**
   * @param allocateId the run's shared id counter. Shots, missiles, and Raiders draw from one
   *   sequence, and tie-breaks read it, so the order must not change.
   */
  constructor(
    private readonly playfield: Playfield,
    private readonly scenario: RandomStream,
    private readonly allocateId: () => number,
  ) {}

  get raiders(): readonly Raider[] {
    return this.bodies;
  }

  get downloads(): readonly Download[] {
    return this.queue;
  }

  get kills(): number {
    return this.killCount;
  }

  /** No live body and nothing still downloading. The last wave is over. */
  get isClear(): boolean {
    return this.bodies.length === 0 && this.queue.length === 0;
  }

  /** Hitbox for this body: a heavy Raider is bigger (ADR-0002 3.3). */
  radiusOf(raider: Raider): number {
    return (raider.kind === 'heavy' ? HEAVY_RADIUS_UNITS : RAIDER_RADIUS_UNITS) * this.playfield.fighterScale;
  }

  /** Raiders only: heavies have their own count and do not use the Director's cap or floor. */
  private get raiderCount(): number {
    let count = 0;
    for (const body of this.bodies) if (body.kind === 'raider') count += 1;
    return count;
  }

  get heavyCount(): number {
    return this.bodies.length - this.raiderCount;
  }

  /** Where Raiders appear, and where *Spoilers* shows the blips. */
  get spawnY(): number {
    return RAIDER_HALF_HEIGHT_UNITS * this.playfield.fighterScale + 8;
  }

  find(id: number): Raider | null {
    return this.bodies.find((body) => body.id === id) ?? null;
  }

  /**
   * The one way a Raider dies, whatever killed it: the fact goes out, the soul queues a download
   * while the loop is on (PRD 6), and the body leaves the swarm.
   */
  destroy(raider: Raider, events: DomainEvent[], loopOn: boolean, downloadSeconds: number): void {
    const heavy = raider.kind === 'heavy';
    events.push({ type: 'RaiderDestroyed', id: raider.id, x: raider.x, y: raider.y, heavy });
    // Only Raiders resurrect. A heavy Raider is gone for good (ADR-0002 3.3).
    if (loopOn && !heavy) {
      this.queue.push(new Download(raider.identityId, raider.deaths + 1, raider.x, raider.y, downloadSeconds));
    }
    const index = this.bodies.indexOf(raider);
    if (index >= 0) this.bodies.splice(index, 1);
    this.killCount += 1;
  }

  /** The nearest `tokens` Raiders above the Viper may fire (PRD 9). Nobody fires when `allowed` is false. */
  assignAttackTokens(viperX: number, viperY: number, allowed: boolean, tokens: number): void {
    for (const raider of this.bodies) raider.setArmed(false);
    if (!allowed) return;
    // A heavy Raider carries its own token: armed whenever it is above the Viper.
    for (const body of this.bodies) if (body.kind === 'heavy' && body.y < viperY) body.setArmed(true);
    const ranked = this.bodies
      .filter((raider) => raider.kind === 'raider' && raider.y < viperY)
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.x - viperX, left.y - viperY);
        const rightDistance = Math.hypot(right.x - viperX, right.y - viperY);
        return leftDistance - rightDistance || left.id - right.id;
      });
    for (const raider of ranked.slice(0, tokens)) raider.setArmed(true);
  }

  /** The `tokens` Raiders farthest from the Viper dive the fleet (PRD 7.1). */
  assignStrafeTokens(viperX: number, viperY: number, tokens: number): void {
    for (const raider of this.bodies) raider.setStrafing(false);
    // Heavies do not dive the fleet.
    const ranked = this.bodies.filter((body) => body.kind === 'raider').sort((left, right) => {
      const leftDistance = Math.hypot(left.x - viperX, left.y - viperY);
      const rightDistance = Math.hypot(right.x - viperX, right.y - viperY);
      return rightDistance - leftDistance || left.id - right.id;
    });
    for (const raider of ranked.slice(0, tokens)) raider.setStrafing(true);
  }

  /**
   * Moves every Raider. A strafer that reaches the fleet line calls `onStrafe` before it wraps, so
   * the fleet is hit where the Raider was. `holding` is The Speech: everyone hovers.
   */
  advance(tickSeconds: number, fleetLineY: number, holding: boolean, onStrafe: (raider: Raider) => void): void {
    if (holding) {
      for (const raider of this.bodies) raider.holdStation();
      return;
    }
    for (const raider of this.bodies) {
      raider.advance(tickSeconds);
      if (raider.isStrafing && raider.crossedFleetLine(fleetLineY)) {
        onStrafe(raider);
        raider.reappearAtTop();
        continue;
      }
      if (raider.hasLeftTheBottom) raider.reappearAtTop();
    }
  }

  advanceDownloads(tickSeconds: number): void {
    for (const download of this.queue) download.advance(tickSeconds);
  }

  /**
   * *Spoilers*: the first blip on a shot's path, at the return column. Ties go to the lowest
   * identity, so the pick is stable.
   */
  ghostOnPath(previousX: number, previousY: number, x: number, y: number, radius: number): Download | null {
    const ghostY = this.spawnY;
    let bestAlong = Infinity;
    let best: Download | null = null;
    for (const download of this.queue) {
      const along = movingCircleHitAlong(previousX, previousY, x, y, radius, download.x, ghostY, GHOST_RADIUS_UNITS);
      if (along === null) continue;
      if (along < bestAlong || (along === bestAlong && download.identityId < (best?.identityId ?? Infinity))) {
        bestAlong = along;
        best = download;
      }
    }
    return best;
  }

  /**
   * The jump: the Raiders in this sector leave with the fleet (not a kill). Pending downloads
   * finish in transit and arrive first next cycle. Once the ship is gone, the live ones come back
   * as the last wave, so jumping is not a win (PRD 6).
   */
  clearAtJump(shipGone: boolean, downloadSeconds: number): void {
    if (shipGone) {
      for (const raider of this.bodies) {
        if (raider.kind === 'heavy') continue;
        this.queue.push(new Download(raider.identityId, raider.deaths, raider.x, raider.y, downloadSeconds));
      }
    }
    this.bodies.length = 0;
    for (const download of this.queue) download.arriveNow();
  }

  /**
   * Keeps live Raiders between the Director's floor and cap (PRD 6, 9). Ready downloads come back
   * first. A pending download reserves a slot, so a refill does not add pressure, unless the swarm
   * has fallen below the floor: then a fresh Raider comes anyway. A finished download never pushes
   * past the cap; it waits for a free slot. Once the ship is gone, nothing fresh arrives.
   */
  fill(events: DomainEvent[], shipGone: boolean, rules: SpawnRules): void {
    const { cap, floor } = rules;
    while (this.raiderCount < cap) {
      const readyIndex = this.queue.findIndex((download) => download.isReady);
      if (readyIndex >= 0) {
        const ready = this.queue[readyIndex];
        if (!ready) return;
        this.queue.splice(readyIndex, 1);
        this.spawn(events, rules, { identityId: ready.identityId, deaths: ready.deaths, x: ready.x });
        continue;
      }

      if (shipGone) return;
      const reserved = this.raiderCount + this.queue.length >= cap;
      if (reserved && this.raiderCount >= floor) return;
      this.spawn(events, rules);
    }
  }

  /**
   * The last wave (PRD 5.2, 6): when the resurrection ship dies, the swarm tops up to the cap once.
   * Nothing downloads after that, so these are the last Raiders of the run.
   */
  lastWave(events: DomainEvent[], rules: SpawnRules): void {
    while (this.raiderCount < rules.cap) this.spawn(events, rules);
  }

  private spawn(
    events: DomainEvent[],
    rules: SpawnRules,
    returning?: { readonly identityId: number; readonly deaths: number; readonly x: number },
  ): void {
    if (this.raiderCount >= rules.cap) return;
    const minX = raiderSpawnMinX(this.playfield.fighterScale);
    const maxX = raiderSpawnMaxX(this.playfield.width, this.playfield.fighterScale);
    const column = returning?.x ?? this.pickFreshColumn(minX, maxX);
    const pattern = this.pickPattern(rules.sineShare);
    // A weave is centred far enough in that the whole sway stays in the lane.
    const inset = pattern === 'sine' ? SINE_AMPLITUDE_UNITS : 0;
    const x = Math.min(maxX - inset, Math.max(minX + inset, column));
    const identityId = returning?.identityId ?? this.nextIdentityId;
    if (!returning) this.nextIdentityId += 1;

    const raider = new Raider(this.allocateId(), identityId, x, this.spawnY, {
      deaths: returning?.deaths ?? 0,
      returned: Boolean(returning),
      pattern,
    });
    this.bodies.push(raider);
    events.push({
      type: 'RaiderSpawned',
      id: raider.id,
      identityId: raider.identityId,
      x: raider.x,
      y: raider.y,
      returned: raider.returned,
      deaths: raider.deaths,
      heavy: false,
    });
  }

  /** One heavy Raider on a fresh column (ADR-0002 3.3). It never comes from the download queue. */
  spawnHeavy(events: DomainEvent[]): void {
    const minX = raiderSpawnMinX(this.playfield.fighterScale) + HEAVY_RADIUS_UNITS;
    const maxX = raiderSpawnMaxX(this.playfield.width, this.playfield.fighterScale) - HEAVY_RADIUS_UNITS;
    const x = this.pickFreshColumn(minX, maxX);
    const y = HEAVY_HALF_HEIGHT_UNITS * this.playfield.fighterScale + 8;
    const heavy = new Raider(this.allocateId(), this.nextIdentityId, x, y, { kind: 'heavy' });
    this.nextIdentityId += 1;
    this.bodies.push(heavy);
    events.push({
      type: 'RaiderSpawned',
      id: heavy.id,
      identityId: heavy.identityId,
      x: heavy.x,
      y: heavy.y,
      returned: false,
      deaths: 0,
      heavy: true,
    });
  }

  /** No draw at 0 or 1, so an all-dive profile spends no gameplay randomness (seeded tests stay put). */
  private pickPattern(sineShare: number): FlightPattern {
    if (sineShare <= 0) return 'dive';
    if (sineShare >= 1) return 'sine';
    return this.scenario.next() < sineShare ? 'sine' : 'dive';
  }

  private pickFreshColumn(minX: number, maxX: number): number {
    const gap = RAIDER_HALF_WIDTH_UNITS * this.playfield.fighterScale * 4;
    for (let attempt = 0; attempt < 8; attempt++) {
      const x = this.scenario.between(minX, maxX);
      if (this.bodies.every((raider) => Math.abs(raider.x - x) >= gap)) return x;
    }
    return this.scenario.between(minX, maxX);
  }
}
