import { reactive } from 'vue';
import type { FrameStats } from '../../application/FrameStats';

/**
 * A plain reactive store for the overlay (ADR-0001 D5, open question 3: no Pinia until something
 * needs it). Gameplay never reads from here.
 */
const state = reactive<{ stats: FrameStats | null; showDebug: boolean; dragHintDismissed: boolean }>({
  stats: null,
  showDebug: true,
  // ASSUMPTION: the "already seen this" flag lives in memory until storage arrives in M5, so on a
  // touch device the hint shows once per page load. That is the PRD 13.2 fallback for no storage.
  dragHintDismissed: false,
});

export const hudStore = {
  state,
  setStats(stats: FrameStats): void {
    state.stats = stats;
  },
  dismissDragHint(): void {
    state.dragHintDismissed = true;
  },
  toggleDebug(): void {
    state.showDebug = !state.showDebug;
  },
};
