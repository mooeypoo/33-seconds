<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';

/**
 * The 33 as an FTL ring, for the CIC console (PRD 5.1, ADR-0002 Phase 2). The ring fills across the
 * cycle, and for the spool it turns amber, the console edge thickens, and the caption says so:
 * colour is never the only cue, and nothing flashes (PRD 15).
 */
const CIRCUMFERENCE = 2 * Math.PI * 46;

const hud = computed(() => hudStore.state.hud);
const spooling = computed(() => hud.value?.cyclePhase === 'spooling');
const counting = computed(() => hud.value?.cyclePhase !== 'jumping' && hud.value?.cyclePhase !== 'recovering');
const dash = computed(() => `${String((hud.value?.cycleProgress ?? 0) * CIRCUMFERENCE)} ${String(CIRCUMFERENCE)}`);
const caption = computed(() => {
  const phase = hud.value?.cyclePhase;
  if (phase === 'spooling') return `Spooling · Cycle ${String(hud.value?.cycleIndex ?? 1)}`;
  if (phase === 'jumping') return 'Jumping';
  if (phase === 'recovering') return 'Jumped';
  return `FTL · Cycle ${String(hud.value?.cycleIndex ?? 1)}`;
});
const detail = computed(() => {
  if (!counting.value) return 'The next cycle starts when you apply a card.';
  if (spooling.value) return 'The fleet jumps at zero. Stay alive.';
  return `Jump in ${String(hud.value?.secondsRemaining ?? 33)} s. The spool starts at 8.`;
});
</script>

<template>
  <div class="ring-panel" :class="{ spooling }" data-testid="cycle-clock" data-lesson-target="clock" role="timer" aria-label="Jump countdown">
    <svg class="ring" width="96" height="96" viewBox="0 0 108 108" aria-hidden="true">
      <circle class="track" cx="54" cy="54" r="46" />
      <circle class="fill" cx="54" cy="54" r="46" :stroke-dasharray="dash" transform="rotate(-90 54 54)" />
    </svg>
    <span v-if="counting" class="seconds" data-testid="seconds-remaining">{{ hud?.secondsRemaining ?? 33 }}</span>
    <div class="words">
      <span class="caption">{{ caption }}</span>
      <span class="detail">{{ detail }}</span>
    </div>
  </div>
</template>

<style scoped>
.ring-panel {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-space);
  border: 1px solid var(--color-dradis-line);
  border-radius: var(--radius);
}

.ring-panel.spooling {
  border: 2px solid var(--color-amber);
  padding: calc(var(--space-3) - 1px) calc(var(--space-4) - 1px);
}

.ring {
  flex: none;
}

.track {
  fill: none;
  stroke: var(--color-dradis-line);
  stroke-width: 8;
}

.fill {
  fill: none;
  stroke: var(--color-dradis-soft);
  stroke-width: 8;
}

.spooling .fill {
  stroke: var(--color-amber);
}

/* The number sits in the ring's middle: 96px ring, left padding included. */
.seconds {
  position: absolute;
  left: calc(var(--space-4) + 48px);
  top: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 30px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--color-dradis-pale);
}

.spooling .seconds {
  color: var(--color-amber);
}

.words {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.caption {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

.spooling .caption {
  color: var(--color-amber);
}

.detail {
  font-size: 13px;
  line-height: 1.35;
  color: var(--color-text-muted);
}
</style>
