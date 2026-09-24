import { DESKTOP_PLAYFIELD, PHONE_PLAYFIELD, type Playfield } from '../domain/shared/world';

/**
 * Same cutoff as the full-bleed column in the overlay. A window this narrow plays the phone
 * world. Wider than this plays the desktop lane. Chosen once, when the run starts.
 */
export const NARROW_LAYOUT_MAX_PX = 800;

export function playfieldForWindow(widthPx: number): Playfield {
  return widthPx <= NARROW_LAYOUT_MAX_PX ? PHONE_PLAYFIELD : DESKTOP_PLAYFIELD;
}
