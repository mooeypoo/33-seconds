import {
  clamp,
  DESKTOP_PLAYFIELD,
  DESKTOP_WORLD_WIDTH_UNITS,
  PHONE_PLAYFIELD,
  PHONE_WORLD_WIDTH_UNITS,
  WORLD_HEIGHT_UNITS,
  type Playfield,
} from '../domain/shared/world';

/**
 * Same cutoff as the full-bleed column in the overlay. A window this narrow plays the phone
 * world. Wider than this plays the desktop lane. Chosen once, when the run starts.
 */
export const NARROW_LAYOUT_MAX_PX = 800;

export function playfieldForWindow(widthPx: number): Playfield {
  return widthPx <= NARROW_LAYOUT_MAX_PX ? PHONE_PLAYFIELD : DESKTOP_PLAYFIELD;
}

/**
 * A phone's world, as wide as its lane allows (PRD 13.2). The world is always 480 units tall, so a
 * lane wider than 9:16 gets a wider world instead of empty bands at its sides. Never narrower than
 * the phone world, and never wider than the desktop one: those two are the widths the balance has
 * been played at. Rounded down, so the world never overflows the lane.
 */
export function playfieldForLane(laneWidthPx: number, laneHeightPx: number): Playfield {
  if (!(laneWidthPx > 0 && laneHeightPx > 0)) return PHONE_PLAYFIELD;
  const fittedUnits = Math.floor((WORLD_HEIGHT_UNITS * laneWidthPx) / laneHeightPx);
  return {
    width: clamp(fittedUnits, PHONE_WORLD_WIDTH_UNITS, DESKTOP_WORLD_WIDTH_UNITS),
    fighterScale: PHONE_PLAYFIELD.fighterScale,
  };
}
