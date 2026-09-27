import { babble } from '../../application/audio/babble';
import type { SoundBank, ZzfxParameters } from '../../application/audio/soundBank';
import type { SoundId } from '../../application/audio/soundIds';
import { DEFAULT_RADIO, type RadioSettings, type Voice } from '../../application/audio/voices';
import type { AudioPort } from '../../application/ports/AudioPort';
import { createRandomStream } from '../../domain/shared/random';
import type * as Zzfx from 'zzfx';
import { buildRadio } from './voiceRadio';

type ZzfxModule = typeof Zzfx;

/** ZzFX's parameter 1: how much each play wanders in pitch. Applied per play, as ZZFXSound does. */
const RANDOMNESS_SLOT = 1;
/** ZzFX's default for that slot when the array leaves it empty. */
const DEFAULT_RANDOMNESS = 0.05;

interface Sound {
  readonly buffer: AudioBuffer;
  readonly randomness: number;
}

/** Long enough to hide a click at either end of a voice, short enough not to read as a fade. */
const VOICE_FADE_IN_SECONDS = 0.01;
const VOICE_FADE_OUT_SECONDS = 0.06;
/** A hushed voice goes this fast: a cut, without the click. */
const HUSH_SECONDS = 0.05;

interface Talking {
  readonly source: AudioBufferSourceNode;
  readonly envelope: GainNode;
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
  private engine: ZzfxModule['ZZFX'] | null = null;
  private radioInput: AudioNode | null = null;
  /** Every voice passes through here, radio or not, so the voice level holds either way. */
  private voiceBus: GainNode | null = null;
  private talking: Talking | null = null;
  private radioOn = true;
  /**
   * Voice syllables by their ZzFX values. A voice's syllables never change during a run, so each is
   * synthesized once and every line after that only resamples it.
   */
  private readonly syllables = new Map<string, ArrayLike<number>>();

  constructor(
    private readonly bank: SoundBank,
    private readonly radio: RadioSettings = DEFAULT_RADIO,
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
    this.voiceBus = new GainNode(context, { gain: this.radio.level });
    this.voiceBus.connect(this.master);
    this.radioInput = buildRadio(context, this.radio, this.voiceBus);
    void context.resume().catch(() => {});

    void this.loadZzfx()
      .then(({ ZZFX }) => {
        void ZZFX.audioContext.close().catch(() => {});
        // Our master takes ZzFX's own scale, so a sound is as loud here as in the Sound Designer.
        this.master?.gain.setValueAtTime(this.gain * ZZFX.volume, context.currentTime);
        this.zzfxScale = ZZFX.volume;
        this.engine = ZZFX;
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

  speak(voice: Voice, seconds: number, seed: number): void {
    const context = this.context;
    const engine = this.engine;
    if (!context || !this.voiceBus || !this.radioInput || !engine) return;
    this.hush();
    try {
      // A fresh stream per line, well under a millisecond once the syllables are cached (journal 0062).
      const samples = babble(voice, seconds, engine.sampleRate, createRandomStream(seed), (...parameters) => {
        const key = parameters.join(',');
        const cached = this.syllables.get(key);
        if (cached) return cached;
        const built = engine.buildSamples(...parameters);
        this.syllables.set(key, built);
        return built;
      });
      if (samples.length === 0) return;
      const buffer = context.createBuffer(1, samples.length, engine.sampleRate);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const envelope = context.createGain();
      const now = context.currentTime;
      const end = now + buffer.duration;
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(1, now + VOICE_FADE_IN_SECONDS);
      envelope.gain.setValueAtTime(1, Math.max(now + VOICE_FADE_IN_SECONDS, end - VOICE_FADE_OUT_SECONDS));
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(envelope).connect(this.radioOn ? this.radioInput : this.voiceBus);
      const talking = { source, envelope };
      source.onended = (): void => {
        source.disconnect();
        envelope.disconnect();
        if (this.talking === talking) this.talking = null;
      };
      source.start(now);
      this.talking = talking;
    } catch {
      // A voice is decoration: failing to speak must never break the run.
    }
  }

  hush(): void {
    const context = this.context;
    const talking = this.talking;
    if (!context || !talking) return;
    this.talking = null;
    try {
      const now = context.currentTime;
      talking.envelope.gain.cancelScheduledValues(now);
      talking.envelope.gain.setValueAtTime(talking.envelope.gain.value, now);
      talking.envelope.gain.linearRampToValueAtTime(0, now + HUSH_SECONDS);
      talking.source.stop(now + HUSH_SECONDS);
    } catch {
      // Already stopped: nothing to hush.
    }
  }

  /** The sound test's radio on/off switch, for comparing. Not part of `AudioPort`: a run always uses the radio. */
  setRadio(on: boolean): void {
    this.radioOn = on;
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
