/**
 * Portrait worlds in logical units, which are also the pixels of the low-resolution render
 * target (PRD 13.2 and 14, decision 14). A phone is 9:16. A wide window is the same height
 * and a wider lane. Height stays put so the canvas scale, set by the window height, can
 * show the fighters a little larger without stretching the fleet.
 */
export const PHONE_WORLD_WIDTH_UNITS = 270;

export const DESKTOP_WORLD_WIDTH_UNITS = 324;

/** Phone width. Tests and a narrow window use this. */
export const WORLD_WIDTH_UNITS = PHONE_WORLD_WIDTH_UNITS;

export const WORLD_HEIGHT_UNITS = 480;

/**
 * Desktop Viper and Raiders, pictures and hitboxes together. A quarter step.
 * The fleet, the shots, and a phone stay at 1.
 */
export const DESKTOP_FIGHTER_SCALE = 1.25;

export interface Playfield {
  readonly width: number;
  readonly fighterScale: number;
}

export const PHONE_PLAYFIELD: Playfield = { width: PHONE_WORLD_WIDTH_UNITS, fighterScale: 1 };

export const DESKTOP_PLAYFIELD: Playfield = {
  width: DESKTOP_WORLD_WIDTH_UNITS,
  fighterScale: DESKTOP_FIGHTER_SCALE,
};

/** Clamps a value into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
