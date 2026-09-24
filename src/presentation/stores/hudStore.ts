import { reactive } from 'vue';
import type { FrameStats } from '../../application/FrameStats';
import type { HudViewModel } from '../../application/HudViewModel';

/**
 * A plain reactive store for the overlay (ADR-0001 D5, open question 3: no Pinia until something
 * needs it). Gameplay never reads from here.
 *
 * `hud` is what the player sees, fed by the session every frame (ADR-0002 D2). `stats` is the debug
 * readout, fed by the renderer a few times a second.
 */
/** Dev, and the Playwright build. A normal production build leaves this off, so players never see it. */
const showDebugByDefault = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG === 'true';

const state = reactive<{
  hud: HudViewModel | null;
  stats: FrameStats | null;
  showDebug: boolean;
  dragHintDismissed: boolean;
}>({
  hud: null,
  stats: null,
  showDebug: showDebugByDefault,
  dragHintDismissed: false,
});

export const hudStore = {
  state,
  /**
   * Copies field by field into the same reactive object, so a frame where nothing changed
   * triggers nothing, and a frame where only the clock moved re-renders only the clock.
   */
  setHud(hud: HudViewModel): void {
    if (state.hud === null) state.hud = { ...hud };
    else Object.assign(state.hud, hud);
  },
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
