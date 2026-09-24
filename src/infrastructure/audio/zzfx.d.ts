/**
 * The part of zzfx 1.3.2 we use. The package ships no types. Checked against its `ZzFX.js`.
 * Importing the module creates an AudioContext at once, which is why it is only ever imported
 * dynamically, after the player's first gesture (ZzfxAudio).
 */
declare module 'zzfx' {
  export const ZZFX: {
    /** ZzFX's own master scale (0.3). The Sound Designer previews at this level. */
    volume: number;
    sampleRate: number;
    audioContext: AudioContext;
    buildSamples(...parameters: (number | undefined)[]): number[];
  };
}
