/**
 * Placeholder colours until the art pass (PRD 14). Flat shapes on purpose: they are meant to be
 * swapped for sprites, not refined. The single hot red is reserved for Cylons, so nothing else
 * uses it.
 */
export const PALETTE = {
  space: 0x0b0f14,
  viperHull: 0xc6ced8,
  viperCockpit: 0x6fa8d0,
  engineGlow: 0xffb454,
  cylonRed: 0xff2b2b,
  raiderHull: 0x3a4248,
  /** Ghost blip and the Returned glow and count. Grey on purpose: only live Cylons are red (PRD 9). */
  ghostBlip: 0x9aa8b4,
  playerShot: 0x4fe19a,
  aimedShot: 0xff2b2b,
  strayShot: 0xf2a23a,
  /** The civilian line. Olive, never Cylon red (PRD 9). */
  fleetLine: 0x3d5a4c,
  civilianHull: 0x6b8f73,
  civilianDinged: 0x2f4536,
  /** The X on a disabled ship. Dark rust: damage, quiet, and never Cylon red (PRD 9). */
  disabledMark: 0xa4582a,
  /** Glass bubble around a shielded resurrection ship. Not Cylon red (PRD 9, 15). */
  shipShield: 0x9ec8dc,
  /** The missile lock reticle (ring plus four-quadrant cross). Dradis green, never Cylon red (PRD 9, 15). */
  missileLock: 0x4fe19a,
  /** Imaginary Six outline and beam. Pale Dradis, never Cylon red, never a flicker (PRD 10.3, 15). */
  sixGlow: 0xb8ffdc,
  /** A Training Run lesson's outline: the same amber as the HUD outlines (styles.css). Still, never a flash. */
  lessonFocus: 0xffc457,
} as const;
