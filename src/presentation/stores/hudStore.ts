import { reactive } from 'vue';
import type { FrameStats } from '../../application/FrameStats';

/**
 * A plain reactive store for the overlay (ADR-0001 D5, open question 3: no Pinia until something
 * needs it). Gameplay never reads from here.
 */
/** Dev, and the Playwright build. A normal production build leaves this off, so players never see it. */
const showDebugByDefault = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG === 'true';

const state = reactive<{ stats: FrameStats | null; showDebug: boolean; dragHintDismissed: boolean }>({
  stats: null,
  showDebug: showDebugByDefault,
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
