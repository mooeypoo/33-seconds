import type { StoragePort } from './ports/StoragePort';

/** Namespaced, versioned (ADR-0001 D10). Bump the suffix when the envelope shape changes. */
export const PLAYER_SETTINGS_KEY = 'thirty-three:v1:settings';

export const PLAYER_SETTINGS_VERSION = 1;

/**
 * Comfort settings and seen flags. No identifiers, no timestamps, no scores yet (PRD 17, D10).
 */
export interface PlayerSettingsSnapshot {
  readonly version: typeof PLAYER_SETTINGS_VERSION;
  /** Instant, total mute. Default off: the title announces sound first (PRD 14.1). */
  readonly muted: boolean;
  /** In-game reduced-effects. OR'd with prefers-reduced-motion (PRD 15). */
  readonly reducedEffects: boolean;
  /** First-run drag hint on a touch device (PRD 13.2). */
  readonly dragHintSeen: boolean;
  /**
   * Swap the pixel display face for the readable one everywhere (PRD 14, 15). Added after v1
   * shipped: an older envelope without it reads as off, so no version bump.
   */
  readonly readableFont: boolean;
  /**
   * Master volume, 0..1 (PRD 14.1). Added after v1 shipped: an older envelope without it reads as
   * the default, so no version bump.
   */
  readonly volume: number;
}

/** Loud enough to hear over a phone speaker, with room to turn it up. */
export const DEFAULT_VOLUME = 0.7;

export const DEFAULT_PLAYER_SETTINGS: PlayerSettingsSnapshot = {
  version: PLAYER_SETTINGS_VERSION,
  muted: false,
  reducedEffects: false,
  dragHintSeen: false,
  readableFont: false,
  volume: DEFAULT_VOLUME,
};

/** Anything that is not a finite number in 0..1 is not a volume we trust. */
function parseVolume(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_VOLUME;
}

/**
 * Treats storage as hostile. Unknown shapes, wrong versions, and non-booleans become defaults.
 */
export function parsePlayerSettings(raw: unknown): PlayerSettingsSnapshot {
  if (raw === null || typeof raw !== 'object') return { ...DEFAULT_PLAYER_SETTINGS };
  const record = raw as Record<string, unknown>;
  if (record.version !== PLAYER_SETTINGS_VERSION) return { ...DEFAULT_PLAYER_SETTINGS };
  return {
    version: PLAYER_SETTINGS_VERSION,
    muted: record.muted === true,
    reducedEffects: record.reducedEffects === true,
    dragHintSeen: record.dragHintSeen === true,
    readableFont: record.readableFont === true,
    volume: parseVolume(record.volume),
  };
}

/**
 * OS reduced-motion always reduces. The in-game toggle can only add reduction, never undo the OS
 * (PRD 15). ASSUMPTION: players who want the full look on a reduced-motion OS can wait; comfort
 * wins if they disagree.
 */
export function effectiveReducedEffects(osPrefersReducedMotion: boolean, setting: boolean): boolean {
  return osPrefersReducedMotion || setting;
}

/**
 * Loads, mutates, and writes player settings. Writes are best-effort: a failed save does not
 * undo the in-memory change, so mute still works when storage is full.
 */
export class PlayerSettings {
  private current: PlayerSettingsSnapshot;
  private readonly listeners = new Set<(snapshot: PlayerSettingsSnapshot) => void>();

  constructor(private readonly storage: StoragePort) {
    let raw: unknown;
    try {
      raw = storage.read(PLAYER_SETTINGS_KEY);
    } catch {
      raw = null;
    }
    this.current = parsePlayerSettings(raw);
  }

  get snapshot(): PlayerSettingsSnapshot {
    return this.current;
  }

  /** Called now and after every change. Returns an unsubscribe function. */
  subscribe(listener: (snapshot: PlayerSettingsSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  setMuted(muted: boolean): void {
    this.patch({ muted });
  }

  /** Clamped to 0..1. A value that is not a number is ignored, not stored. */
  setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return;
    this.patch({ volume: Math.min(1, Math.max(0, volume)) });
  }

  setReducedEffects(reducedEffects: boolean): void {
    this.patch({ reducedEffects });
  }

  setReadableFont(readableFont: boolean): void {
    this.patch({ readableFont });
  }

  markDragHintSeen(): void {
    this.patch({ dragHintSeen: true });
  }

  private patch(partial: Partial<Omit<PlayerSettingsSnapshot, 'version'>>): void {
    this.current = { ...this.current, ...partial, version: PLAYER_SETTINGS_VERSION };
    try {
      this.storage.write(PLAYER_SETTINGS_KEY, this.current);
    } catch {
      // Quota, a hostile adapter, private browsing: mute still holds in memory (ADR-0001 D10).
    }
    for (const listener of this.listeners) listener(this.current);
  }
}
