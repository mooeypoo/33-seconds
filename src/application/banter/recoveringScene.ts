import recovering from '../../content/scenes/recovering.json';
import type { DamageBand } from '../../domain/cycle/damageBand';
import type { RandomStream } from '../../domain/shared/random';
import { commsDurationSeconds, type CommsLine } from './Banter';
import { isSpeaker, speakerName, type BanterSpeaker } from './lines';

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
 * The one line between cycles (PRD 12.3): the opening beat of a scene chosen for the damage band,
 * on the banter stream. The clock is the caller's, so pause freezes it.
 */
export class ScenePlayer {
  private shown: { readonly line: CommsLine; remainingSeconds: number } | null = null;

  start(band: DamageBand, random: RandomStream, catalog: readonly RecoveringScene[] = RECOVERING_SCENES): void {
    const scene = pickWeighted(
      catalog.filter((entry) => entry.bands.includes(band)),
      random,
    );
    // ASSUMPTION: only the opener plays, so the rest of the scene stays unread in the JSON until the
    // owner trims it. One line keeps the pick screen quiet (2026-09-24 playtest).
    const opener = scene?.beats[0];
    if (!opener) {
      this.stop();
      return;
    }
    this.shown = {
      line: { speakerName: speakerName(opener.speaker), text: opener.text },
      remainingSeconds: commsDurationSeconds(opener.text),
    };
  }

  stop(): void {
    this.shown = null;
  }

  get active(): boolean {
    return this.shown !== null;
  }

  get line(): CommsLine | null {
    return this.shown?.line ?? null;
  }

  advance(seconds: number): void {
    if (this.shown === null || !Number.isFinite(seconds) || seconds <= 0) return;
    this.shown.remainingSeconds -= seconds;
    if (this.shown.remainingSeconds <= 0) this.shown = null;
  }
}
