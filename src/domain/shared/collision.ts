/**
 * Gameplay collision is circle overlap in the domain (ADR-0001 D4). Phaser never decides a hit.
 */

/** True when two circles overlap or touch. */
export function circlesOverlap(
  leftX: number,
  leftY: number,
  leftRadius: number,
  rightX: number,
  rightY: number,
  rightRadius: number,
): boolean {
  const distanceX = leftX - rightX;
  const distanceY = leftY - rightY;
  const combined = leftRadius + rightRadius;
  return distanceX * distanceX + distanceY * distanceY <= combined * combined;
}

/**
 * True when a moving circle whose centre travelled from `start` to `end` overlaps a still circle.
 *
 * Shots travel several of their own radii in one tick, so testing only the landing spot would let
 * them tunnel through a Raider. The still circle is the Raider: it is slow enough that treating it
 * as still for the shot's path is honest.
 */
export function movingCircleHits(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  movingRadius: number,
  stillX: number,
  stillY: number,
  stillRadius: number,
): boolean {
  return movingCircleHitAlong(startX, startY, endX, endY, movingRadius, stillX, stillY, stillRadius) !== null;
}

/**
 * How far along the moving circle's path the hit happens, 0 at the start and 1 at the end.
 * Null when the swept circle misses. Missiles use this to pick the *first* hostile on the path.
 */
export function movingCircleHitAlong(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  movingRadius: number,
  stillX: number,
  stillY: number,
  stillRadius: number,
): number | null {
  return segmentHitAlong(startX, startY, endX, endY, stillX, stillY, movingRadius + stillRadius);
}

/** How far along the segment the closest point in the circle sits, or null on a miss. */
function segmentHitAlong(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  circleX: number,
  circleY: number,
  radius: number,
): number | null {
  const travelX = endX - startX;
  const travelY = endY - startY;
  const travelSquared = travelX * travelX + travelY * travelY;
  const offsetX = circleX - startX;
  const offsetY = circleY - startY;

  if (travelSquared === 0) {
    return offsetX * offsetX + offsetY * offsetY <= radius * radius ? 0 : null;
  }

  let along = (offsetX * travelX + offsetY * travelY) / travelSquared;
  if (along < 0) along = 0;
  else if (along > 1) along = 1;

  const closestX = startX + along * travelX - circleX;
  const closestY = startY + along * travelY - circleY;
  if (closestX * closestX + closestY * closestY > radius * radius) return null;
  return along;
}
