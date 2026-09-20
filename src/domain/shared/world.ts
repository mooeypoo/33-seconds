/**
 * One fixed 9:16 portrait world in logical units, which are also the pixels of the
 * low-resolution render target (PRD 13.2 and 14, decision 14).
 */
export const WORLD_WIDTH_UNITS = 270;

export const WORLD_HEIGHT_UNITS = 480;

/** Clamps a value into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
