import adamaBlink from '../../assets/portraits/adama_blink.png';
import adamaClosed from '../../assets/portraits/adama_closed.png';
import adamaOpen from '../../assets/portraits/adama_open.png';
import baltarBlink from '../../assets/portraits/baltar_blink.png';
import baltarClosed from '../../assets/portraits/baltar_closed.png';
import baltarOpen from '../../assets/portraits/baltar_open.png';
import duallaBlink from '../../assets/portraits/dualla_blink.png';
import duallaClosed from '../../assets/portraits/dualla_closed.png';
import duallaOpen from '../../assets/portraits/dualla_open.png';
import gaetaBlink from '../../assets/portraits/gaeta_blink.png';
import gaetaClosed from '../../assets/portraits/gaeta_closed.png';
import gaetaOpen from '../../assets/portraits/gaeta_open.png';
import roslinBlink from '../../assets/portraits/roslin_blink.png';
import roslinClosed from '../../assets/portraits/roslin_closed.png';
import roslinOpen from '../../assets/portraits/roslin_open.png';
import sixBlink from '../../assets/portraits/six_blink.png';
import sixClosed from '../../assets/portraits/six_closed.png';
import sixOpen from '../../assets/portraits/six_open.png';
import starbuckBlink from '../../assets/portraits/starbuck_blink.png';
import starbuckClosed from '../../assets/portraits/starbuck_closed.png';
import starbuckOpen from '../../assets/portraits/starbuck_open.png';
import tighBlink from '../../assets/portraits/tigh_blink.png';
import tighClosed from '../../assets/portraits/tigh_closed.png';
import tighOpen from '../../assets/portraits/tigh_open.png';
import tyrolBlink from '../../assets/portraits/tyrol_blink.png';
import tyrolClosed from '../../assets/portraits/tyrol_closed.png';
import tyrolOpen from '../../assets/portraits/tyrol_open.png';

/** Mouth, blink, and the one held expression. Signature files are not drawn yet. */
export type PortraitPose = 'closed' | 'open' | 'blink' | 'signature';

interface PortraitFrames {
  readonly closed: string;
  readonly open: string;
  readonly blink: string;
  /** The closed file, until a signature drawing exists. */
  readonly signature: string;
}

function frames(closed: string, open: string, blink: string): PortraitFrames {
  return { closed, open, blink, signature: closed };
}

/** Keyed by the name on the comms line. The picture is a cue beside that name, not instead of it. */
const PORTRAITS: Record<string, PortraitFrames> = {
  Adama: frames(adamaClosed, adamaOpen, adamaBlink),
  Starbuck: frames(starbuckClosed, starbuckOpen, starbuckBlink),
  Gaeta: frames(gaetaClosed, gaetaOpen, gaetaBlink),
  Dualla: frames(duallaClosed, duallaOpen, duallaBlink),
  Tigh: frames(tighClosed, tighOpen, tighBlink),
  Baltar: frames(baltarClosed, baltarOpen, baltarBlink),
  Roslin: frames(roslinClosed, roslinOpen, roslinBlink),
  Tyrol: frames(tyrolClosed, tyrolOpen, tyrolBlink),
  Six: frames(sixClosed, sixOpen, sixBlink),
};

export const PORTRAIT_NAMES: readonly string[] = Object.keys(PORTRAITS);

/**
 * Half a second at the 60 Hz game clock. Two changes a second stays under the flash limit
 * (PRD 15). A blink replaces one of those steps, about once every 4 seconds.
 */
const MOUTH_STEP_TICKS = 30;
const BLINK_EVERY_STEPS = 8;

/** Closed while effects are reduced, so the face does not keep moving. */
export function portraitPose(ticks: number, reducedEffects: boolean): PortraitPose {
  if (reducedEffects || !Number.isFinite(ticks) || ticks < 0) return 'closed';
  const step = Math.floor(ticks / MOUTH_STEP_TICKS);
  if (step % BLINK_EVERY_STEPS === BLINK_EVERY_STEPS - 1) return 'blink';
  return step % 2 === 0 ? 'open' : 'closed';
}

/** Null when the name has no picture, so the overlay can keep the letter block. */
export function portraitSrc(name: string, pose: PortraitPose): string | null {
  const set = PORTRAITS[name];
  if (!set) return null;
  return set[pose];
}
