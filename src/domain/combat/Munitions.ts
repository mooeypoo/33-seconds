import { MAX_MISSILES, Missile } from './missile';
import { MAX_CYLON_SHOTS, MAX_PLAYER_SHOTS, Projectile } from './projectile';
import type { ProjectileOwner } from '../views';

/**
 * Pooled shots and missiles, and the lists of the ones in flight. Pools keep a busy fight from
 * allocating on phones (ADR-0001 D13). Nothing here decides who fires or what a hit does.
 */
export class Munitions {
  private readonly shotPool: Projectile[] = [];
  private readonly shotsInFlight: Projectile[] = [];
  private readonly missilePool: Missile[] = [];
  private readonly missilesInFlight: Missile[] = [];

  get shots(): readonly Projectile[] {
    return this.shotsInFlight;
  }

  get missiles(): readonly Missile[] {
    return this.missilesInFlight;
  }

  /** A dead shot to reuse, a new one under the cap, or null when the sky is full. */
  obtainShot(): Projectile | null {
    const recycled = this.shotPool.find((shot) => !shot.alive);
    if (recycled) return recycled;
    if (this.shotPool.length >= MAX_PLAYER_SHOTS + MAX_CYLON_SHOTS) return null;
    const created = new Projectile();
    this.shotPool.push(created);
    return created;
  }

  /** Puts a revived shot in flight. */
  launchShot(shot: Projectile): void {
    this.shotsInFlight.push(shot);
  }

  countShots(owner: ProjectileOwner): number {
    let count = 0;
    for (const shot of this.shotsInFlight) {
      if (shot.owner === owner) count += 1;
    }
    return count;
  }

  obtainMissile(): Missile | null {
    const recycled = this.missilePool.find((missile) => !missile.alive);
    if (recycled) return recycled;
    if (this.missilePool.length >= MAX_MISSILES) return null;
    const created = new Missile();
    this.missilePool.push(created);
    return created;
  }

  launchMissile(missile: Missile): void {
    this.missilesInFlight.push(missile);
  }

  /** Moves every shot. A Cylon round becomes Stray once it passes the Viper (PRD 7.1). */
  advanceShots(tickSeconds: number, viperY: number): void {
    for (const shot of this.shotsInFlight) {
      shot.advance(tickSeconds);
      shot.becomeStrayIfPast(viperY);
    }
  }

  /** Moves every missile, homing on its target's pose when it still has one. */
  advanceMissiles(tickSeconds: number, poseOf: (targetId: number | null) => { x: number; y: number } | null): void {
    for (const missile of this.missilesInFlight) {
      const target = poseOf(missile.targetId);
      if (target) missile.advance(tickSeconds, target.x, target.y);
      else missile.advance(tickSeconds);
    }
  }

  /** Drops dead rounds from the in-flight lists. Their objects stay in the pools. */
  dropDead(): void {
    compact(this.shotsInFlight);
    compact(this.missilesInFlight);
  }

  reclaimShotsThatLeft(): void {
    for (const shot of this.shotsInFlight) {
      if (shot.hasLeftTheWorld) shot.kill();
    }
    compact(this.shotsInFlight);
  }

  reclaimMissilesThatLeft(): void {
    for (const missile of this.missilesInFlight) {
      if (missile.hasLeftTheWorld) missile.kill();
    }
    compact(this.missilesInFlight);
  }

  /** Clears the sky at the jump. True when anything was in flight. */
  clearAll(): boolean {
    if (this.shotsInFlight.length === 0 && this.missilesInFlight.length === 0) return false;
    for (const shot of this.shotsInFlight) shot.kill();
    for (const missile of this.missilesInFlight) missile.kill();
    compact(this.shotsInFlight);
    compact(this.missilesInFlight);
    return true;
  }
}

/** Keeps the live entries in order, without allocating. */
function compact(list: { readonly alive: boolean }[]): void {
  let write = 0;
  for (let read = 0; read < list.length; read++) {
    const item = list[read];
    if (item?.alive) {
      list[write] = item;
      write += 1;
    }
  }
  list.length = write;
}
