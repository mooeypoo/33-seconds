import type { RadioSettings } from '../../application/audio/voices';

/**
 * The radio every character voice goes through (PRD 14.3): a telephone-ish band and a little
 * saturation, so synthesized voices sound in-world and alike in quality.
 */

/**
 * The level the drive curve is balanced around: about the loudest a voice's syllables peak. A peak
 * this loud comes out at the same level; quieter parts come up a little, as on a real radio.
 */
const DRIVE_REFERENCE_PEAK = 0.25;
/** Drive 1 bends the curve this hard. Past about 20 it stops sounding like a radio. */
const MAX_DRIVE_BEND = 19;
const CURVE_POINTS = 1024;
/** A gentle slope at the band edges. A resonant peak there would whistle on every syllable. */
const BAND_Q = 0.7;

/** High-pass, low-pass, then soft saturation into `destination`. Returns the node to feed. */
export function buildRadio(context: AudioContext, radio: RadioSettings, destination: AudioNode): AudioNode {
  const lowCut = new BiquadFilterNode(context, { type: 'highpass', frequency: radio.lowCutHz, Q: BAND_Q });
  const highCut = new BiquadFilterNode(context, { type: 'lowpass', frequency: radio.highCutHz, Q: BAND_Q });
  lowCut.connect(highCut);
  if (radio.drive <= 0) {
    highCut.connect(destination);
    return lowCut;
  }
  const shaper = new WaveShaperNode(context, { curve: driveCurve(radio.drive), oversample: '4x' });
  highCut.connect(shaper).connect(destination);
  return lowCut;
}

/**
 * tanh, scaled so a signal at the reference peak comes out at the same level: drive changes the
 * texture, not the loudness, so tuning one does not fight the other.
 */
function driveCurve(drive: number): Float32Array<ArrayBuffer> {
  const bend = 1 + drive * MAX_DRIVE_BEND;
  const scale = DRIVE_REFERENCE_PEAK / Math.tanh(bend * DRIVE_REFERENCE_PEAK);
  const curve = new Float32Array(CURVE_POINTS);
  for (let index = 0; index < CURVE_POINTS; index += 1) {
    const x = (index / (CURVE_POINTS - 1)) * 2 - 1;
    curve[index] = Math.tanh(bend * x) * scale;
  }
  return curve;
}
