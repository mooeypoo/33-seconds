import type { SoundBank, ZzfxParameters } from '../../application/audio/soundBank';
import type { SoundId } from '../../application/audio/soundIds';
import type { AudioPort } from '../../application/ports/AudioPort';
import type * as Zzfx from 'zzfx';

type ZzfxModule = typeof Zzfx;

/** ZzFX's parameter 1: how much each play wanders in pitch. Applied per play, as ZZFXSound does. */
const RANDOMNESS_SLOT = 1;
/** ZzFX's default for that slot when the array leaves it empty. */
const DEFAULT_RANDOMNESS = 0.05;

interface Sound {
  readonly buffer: AudioBuffer;
  readonly randomness: number;
}

/**
 * ZzFX behind `AudioPort` (ADR-0001 D12). Sounds are synthesized once from `sounds.json` into
 * buffers, then played through one master gain, so mute and volume reach everything at once.
 *
 * zzfx creates its own AudioContext the moment the module loads. A static import would make one
 * on page load, before any gesture, so the module is imported only inside `unlock`, and only its
 * sample builder is used. Our own context is created synchronously in the gesture, which iOS
 * needs, and zzfx's spare one is closed.
 */
export class ZzfxAudio implements AudioPort {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly sounds = new Map<SoundId, Sound>();
  private gain = 1;
  /** ZzFX's master scale, known once the module has loaded. */
  private zzfxScale = 1;
  private suspended = false;

  constructor(
    private readonly bank: SoundBank,
    private readonly loadZzfx: () => Promise<ZzfxModule> = () => import('zzfx'),
  ) {}

  unlock(): void {
    if (this.context) {
      if (!this.suspended) void this.context.resume().catch(() => {});
      return;
    }
    try {
      this.context = new AudioContext();
    } catch {
      return; // No Web Audio: the game is silent, and whole (PRD 15).
    }
    const context = this.context;
    this.master = context.createGain();
    this.master.gain.value = this.gain;
    // A gentle limiter, so a burst of sounds at once gets squeezed instead of clipping harshly.
    const limiter = context.createDynamicsCompressor();
    this.master.connect(limiter).connect(context.destination);
    void context.resume().catch(() => {});

    void this.loadZzfx()
      .then(({ ZZFX }) => {
        void ZZFX.audioContext.close().catch(() => {});
        // Our master takes ZzFX's own scale, so a sound is as loud here as in the Sound Designer.
        this.master?.gain.setValueAtTime(this.gain * ZZFX.volume, context.currentTime);
        this.zzfxScale = ZZFX.volume;
        for (const [id, parameters] of this.bank) this.sounds.set(id, build(ZZFX, context, parameters));
      })
      .catch(() => {
        // The chunk failed to load (offline, say). Stay silent rather than break the run.
      });
  }

  play(id: SoundId, rate: number): number {
    const context = this.context;
    const sound = this.sounds.get(id);
    if (!context || !this.master || !sound) return 0;
    try {
      const source = context.createBufferSource();
      source.buffer = sound.buffer;
      source.playbackRate.value = rate * (1 + sound.randomness * (Math.random() * 2 - 1));
      source.connect(this.master);
      source.onended = (): void => {
        source.disconnect();
      };
      source.start();
      return sound.buffer.duration / source.playbackRate.value;
    } catch {
      return 0;
    }
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    const context = this.context;
    if (!context) return;
    void (suspended ? context.suspend() : context.resume()).catch(() => {});
  }

  setMasterGain(gain: number): void {
    this.gain = gain;
    if (this.context && this.master) {
      this.master.gain.setValueAtTime(gain * this.zzfxScale, this.context.currentTime);
    }
  }
}

function build(zzfx: ZzfxModule['ZZFX'], context: AudioContext, parameters: ZzfxParameters): Sound {
  const slots = [...parameters];
  const randomness = slots[RANDOMNESS_SLOT] ?? DEFAULT_RANDOMNESS;
  // Build without ZzFX's own frequency wobble: the cached buffer is the sound as written, and the
  // wobble is applied per play instead, so a repeated sound does not repeat exactly.
  slots[RANDOMNESS_SLOT] = 0;
  const samples = zzfx.buildSamples(...slots);
  const buffer = context.createBuffer(1, Math.max(1, samples.length), zzfx.sampleRate);
  buffer.getChannelData(0).set(samples);
  return { buffer, randomness };
}
