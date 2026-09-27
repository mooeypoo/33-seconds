import { reactive } from 'vue';
import type { PlayerSettings, PlayerSettingsSnapshot } from '../../application/playerSettings';
import { DEFAULT_PLAYER_SETTINGS } from '../../application/playerSettings';

/**
 * Overlay-facing copy of player settings. Gameplay never reads this (ADR-0001 D5).
 */
const state = reactive<{ snapshot: PlayerSettingsSnapshot }>({
  snapshot: { ...DEFAULT_PLAYER_SETTINGS },
});

let backend: PlayerSettings | null = null;

export const settingsStore = {
  state,
  bind(settings: PlayerSettings): void {
    backend = settings;
    Object.assign(state.snapshot, settings.snapshot);
  },
  toggleMuted(): void {
    backend?.setMuted(!state.snapshot.muted);
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  setVolume(volume: number): void {
    backend?.setVolume(volume);
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  toggleReducedEffects(): void {
    backend?.setReducedEffects(!state.snapshot.reducedEffects);
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  toggleReadableFont(): void {
    backend?.setReadableFont(!state.snapshot.readableFont);
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  toggleCharacterVoices(): void {
    backend?.setCharacterVoices(!state.snapshot.characterVoices);
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  markDragHintSeen(): void {
    backend?.markDragHintSeen();
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
  markTrainingCompleted(): void {
    backend?.markTrainingCompleted();
    Object.assign(state.snapshot, backend?.snapshot ?? state.snapshot);
  },
};
