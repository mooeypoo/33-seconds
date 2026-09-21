import { WORLD_HEIGHT_UNITS } from '../shared/world';

/**
 * Forward cone for missile lock (PRD 8.2). Heading is always toward the swarm (up, -Y).
 * Half of 70 degrees on each side of straight up.
 */
export const MISSILE_CONE_DEGREES = 70;

/** Long enough to lock the resurrection ship from the fleet line. */
export const MISSILE_LOCK_RANGE_UNITS = WORLD_HEIGHT_UNITS;

const CONE_HALF_COSINE = Math.cos(((MISSILE_CONE_DEGREES / 2) * Math.PI) / 180);

export interface LockCandidate {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface MissileLock {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Nearest hostile inside the forward cone. Ties break by lowest id (PRD 8.2, ADR-0001 D13).
 * `preferId` wins when that body is on the field (*Personal Vendetta* and the factory).
 */
export function pickMissileLock(
  originX: number,
  originY: number,
  candidates: readonly LockCandidate[],
  preferId: number | null = null,
): MissileLock | null {
  if (preferId !== null) {
    const preferred = candidates.find((candidate) => candidate.id === preferId);
    if (preferred) return { id: preferred.id, x: preferred.x, y: preferred.y };
  }

  let best: LockCandidate | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    if (!isInForwardCone(originX, originY, candidate.x, candidate.y)) continue;
    const distance = Math.hypot(candidate.x - originX, candidate.y - originY);
    if (distance < bestDistance || (distance === bestDistance && candidate.id < (best?.id ?? Infinity))) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best ? { id: best.id, x: best.x, y: best.y } : null;
}

/** True when the point sits in the 70-degree cone aimed up from the origin, within lock range. */
export function isInForwardCone(originX: number, originY: number, targetX: number, targetY: number): boolean {
  const deltaX = targetX - originX;
  const deltaY = targetY - originY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= 0 || distance > MISSILE_LOCK_RANGE_UNITS) return false;
  // Up is (0, -1). Dot with the unit vector to the target is -deltaY / distance.
  return -deltaY / distance >= CONE_HALF_COSINE;
}
