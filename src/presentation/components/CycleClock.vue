<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';

/**
 * The 33, in the top band beside fleet health (PRD 5.1, ADR-0002 1.5). Out of the playfield, so it
 * never sits under the Viper. Whole seconds only: a ticking tenth would look like a bomb. The bar
 * fills across the cycle and turns amber for the spool, and the caption says Spooling, so colour
 * is never the only cue.
 */
const state = hudStore.state;

const remaining = computed(() => state.hud?.secondsRemaining ?? 33);
const spooling = computed(() => state.hud?.cyclePhase === 'spooling');
const label = computed(() => {
  const phase = state.hud?.cyclePhase;
  if (phase === 'spooling') return 'Spooling';
  if (phase === 'jumping') return 'Jumping';
  if (phase === 'recovering') return 'Jumped';
  return `Cycle ${String(state.hud?.cycleIndex ?? 1)}`;
});
const fill = computed(() => state.hud?.cycleProgress ?? 0);
/** Between cycles there is no count to show: the caption says what happened, the bar is full. */
const counting = computed(() => state.hud?.cyclePhase !== 'jumping' && state.hud?.cyclePhase !== 'recovering');
</script>

<template>
  <div class="clock" :class="{ spooling }" data-testid="cycle-clock" data-lesson-target="clock" role="timer" aria-label="Jump countdown">
    <p class="top">
      <span class="label">{{ label }}</span>
      <span v-if="counting" class="seconds" data-testid="seconds-remaining">{{ remaining }}</span>
    </p>
    <div class="bar" aria-hidden="true">
      <div class="bar-fill" :style="{ transform: `scaleX(${fill})` }" />
    </div>
  </div>
</template>

<style scoped>
.clock {
  pointer-events: none;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 96px;
  color: var(--color-text);
  text-shadow: 0 1px 0 var(--color-shadow);
}

.top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  white-space: nowrap;
}

.label {
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-dradis);
}

.seconds {
  font-size: 22px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--color-dradis-pale);
}

.bar {
  height: 4px;
  background: rgb(var(--rgb-dradis-line) / 70%);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 100%;
  background: var(--color-dradis-soft);
  transform-origin: left center;
  transform: scaleX(0);
}

/* The spool: amber, and the caption already says so. A colour change, never a flash (PRD 15). */
.spooling .label,
.spooling .seconds {
  color: var(--color-amber);
}

.spooling .bar-fill {
  background: var(--color-amber);
}
</style>
