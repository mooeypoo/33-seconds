import type { DomainEvent } from '../shared/events';
import type { RandomStream } from '../shared/random';
import type { Playfield } from '../shared/world';
import { movingCircleHitAlong } from '../shared/collision';
import {
  Raider,
  RAIDER_HALF_HEIGHT_UNITS,
  RAIDER_HALF_WIDTH_UNITS,
  RAIDER_RADIUS_UNITS,
  raiderSpawnMaxX,
  raiderSpawnMinX,
} from './raider';
import { Download, GHOST_RADIUS_UNITS } from './resurrection';

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

  get raiderRadius(): number {
    return RAIDER_RADIUS_UNITS * this.playfield.fighterScale;
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
    events.push({ type: 'RaiderDestroyed', id: raider.id, x: raider.x, y: raider.y });
    if (loopOn) {
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
    const ranked = this.bodies
      .filter((raider) => raider.y < viperY)
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
    const ranked = [...this.bodies].sort((left, right) => {
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
        this.queue.push(new Download(raider.identityId, raider.deaths, raider.x, raider.y, downloadSeconds));
      }
    }
    this.bodies.length = 0;
    for (const download of this.queue) download.arriveNow();
  }

  /**
   * Keeps live Raiders at the Director cap. Ready downloads come back first; each pending
   * download reserves one slot so a refill cannot add pressure (PRD 6).
   */
  fill(events: DomainEvent[], shipGone: boolean, cap: number): void {
    while (this.bodies.length < cap) {
      const readyIndex = this.queue.findIndex((download) => download.isReady);
      if (readyIndex >= 0) {
        const ready = this.queue[readyIndex];
        if (!ready) return;
        this.queue.splice(readyIndex, 1);
        this.spawn(events, cap, { identityId: ready.identityId, deaths: ready.deaths, x: ready.x });
        continue;
      }

      if (shipGone) return;
      if (this.bodies.length + this.queue.length >= cap) return;
      this.spawn(events, cap);
    }
  }

  private spawn(
    events: DomainEvent[],
    cap: number,
    returning?: { readonly identityId: number; readonly deaths: number; readonly x: number },
  ): void {
    if (this.bodies.length >= cap) return;
    const minX = raiderSpawnMinX(this.playfield.fighterScale);
    const maxX = raiderSpawnMaxX(this.playfield.width, this.playfield.fighterScale);
    const column = returning?.x ?? this.pickFreshColumn(minX, maxX);
    const x = Math.min(maxX, Math.max(minX, column));
    const identityId = returning?.identityId ?? this.nextIdentityId;
    if (!returning) this.nextIdentityId += 1;

    const raider = new Raider(this.allocateId(), identityId, x, this.spawnY, {
      deaths: returning?.deaths ?? 0,
      returned: Boolean(returning),
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
    });
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
