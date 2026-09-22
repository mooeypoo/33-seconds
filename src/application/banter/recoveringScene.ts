import recovering from '../../content/scenes/recovering.json';
import type { DamageBand } from '../../domain/cycle/damageBand';
import type { RandomStream } from '../../domain/shared/random';
import { commsDurationSeconds, type CommsLine } from './Banter';
import { isSpeaker, speakerName, type BanterSpeaker } from './lines';

/** PRD 12.3. A longer scene shrinks so every beat is still heard. */
export const SCENE_CAP_SECONDS = 12;

const MAX_BEAT_CHARS = 72;

export interface SceneBeat {
  readonly speaker: BanterSpeaker;
  readonly text: string;
}

export interface RecoveringScene {
  readonly id: string;
  readonly bands: readonly DamageBand[];
  readonly weight: number;
  readonly beats: readonly SceneBeat[];
}

interface PlayingBeat {
  readonly speakerName: string;
  readonly partnerName: string | null;
  readonly text: string;
  remainingSeconds: number;
}

function isBand(value: unknown): value is DamageBand {
  return value === 'clean' || value === 'rough' || value === 'wrecked';
}

/** Drops a scene that is not 2–4 beats of plain text. */
export function parseScenes(raw: unknown): RecoveringScene[] {
  if (!Array.isArray(raw)) return [];
  const scenes: RecoveringScene[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== 'string' || record.id.length === 0) continue;
    if (record.trigger !== 'CycleRecovering') continue;
    const when = record.when;
    if (when === null || typeof when !== 'object' || !Array.isArray((when as { damageBand?: unknown }).damageBand)) {
      continue;
    }
    const bands = (when as { damageBand: unknown[] }).damageBand.filter(isBand);
    if (bands.length === 0) continue;
    const weight = record.weight === undefined ? 1 : record.weight;
    if (typeof weight !== 'number' || weight <= 0) continue;
    if (!Array.isArray(record.beats) || record.beats.length < 2 || record.beats.length > 4) continue;
    const beats: SceneBeat[] = [];
    let valid = true;
    for (const beat of record.beats) {
      if (beat === null || typeof beat !== 'object') {
        valid = false;
        break;
      }
      const line = beat as Record<string, unknown>;
      if (!isSpeaker(line.speaker) || typeof line.text !== 'string') {
        valid = false;
        break;
      }
      if (line.text.length === 0 || line.text.length > MAX_BEAT_CHARS) {
        valid = false;
        break;
      }
      beats.push({ speaker: line.speaker, text: line.text });
    }
    if (!valid) continue;
    scenes.push({ id: record.id, bands, weight, beats });
  }
  return scenes;
}

export const RECOVERING_SCENES: readonly RecoveringScene[] = parseScenes(recovering);

function pickWeighted(scenes: readonly RecoveringScene[], random: RandomStream): RecoveringScene | null {
  const first = scenes[0];
  if (!first) return null;
  if (scenes.length === 1) return first;
  const total = scenes.reduce((sum, scene) => sum + scene.weight, 0);
  let roll = random.next() * total;
  for (const scene of scenes) {
    roll -= scene.weight;
    if (roll < 0) return scene;
  }
  return scenes[scenes.length - 1] ?? first;
}

/**
 * The beats between cycles. The clock is the caller's, so pause freezes the scene.
 * One scene per Recovering, chosen from the damage band on the banter stream.
 */
export class ScenePlayer {
  private queue: PlayingBeat[] = [];
  private index = 0;
  private playing = false;

  start(band: DamageBand, random: RandomStream, catalog: readonly RecoveringScene[] = RECOVERING_SCENES): void {
    const scene = pickWeighted(
      catalog.filter((entry) => entry.bands.includes(band)),
      random,
    );
    if (!scene) {
      this.stop();
      return;
    }
    const natural = scene.beats.map((beat) => commsDurationSeconds(beat.text));
    const sum = natural.reduce((total, seconds) => total + seconds, 0);
    const scale = sum > SCENE_CAP_SECONDS ? SCENE_CAP_SECONDS / sum : 1;
    this.queue = scene.beats.map((beat, beatIndex) => {
      const previous = scene.beats[beatIndex - 1];
      return {
        speakerName: speakerName(beat.speaker),
        partnerName: previous ? speakerName(previous.speaker) : null,
        text: beat.text,
        remainingSeconds: (natural[beatIndex] ?? 0) * scale,
      };
    });
    this.index = 0;
    this.playing = this.queue.length > 0;
  }

  stop(): void {
    this.playing = false;
    this.queue = [];
    this.index = 0;
  }

  get active(): boolean {
    return this.playing;
  }

  get line(): CommsLine | null {
    if (!this.playing) return null;
    const beat = this.queue[this.index];
    if (!beat) return null;
    return { speakerName: beat.speakerName, text: beat.text, partnerName: beat.partnerName };
  }

  /** True when this call is the one that finishes the scene. */
  advance(seconds: number): boolean {
    if (!this.playing || !Number.isFinite(seconds) || seconds <= 0) return false;
    let left = seconds;
    while (left > 0 && this.playing) {
      const beat = this.queue[this.index];
      if (!beat) {
        this.playing = false;
        return true;
      }
      if (left < beat.remainingSeconds) {
        beat.remainingSeconds -= left;
        return false;
      }
      left -= beat.remainingSeconds;
      beat.remainingSeconds = 0;
      this.index += 1;
      if (this.index >= this.queue.length) this.playing = false;
    }
    return !this.playing;
  }
}
