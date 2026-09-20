import { reactive } from 'vue';
import type { FrameStats } from '../../application/FrameStats';

/**
 * A plain reactive store for the overlay (ADR-0001 D5, open question 3: no Pinia until something
 * needs it). Gameplay never reads from here.
 */
const state = reactive<{ stats: FrameStats | null; showDebug: boolean }>({
  stats: null,
  showDebug: true,
});

export const hudStore = {
  state,
  setStats(stats: FrameStats): void {
    state.stats = stats;
  },
  toggleDebug(): void {
    state.showDebug = !state.showDebug;
  },
};
