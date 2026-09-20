<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';

/**
 * The 33. Always visible during a run, because it is the game's identity (PRD 5.1). Whole seconds
 * only: a ticking tenth would look like a bomb, and this is a clock you work around, not against.
 * Quiet on purpose: a louder countdown waits for the M5 HUD (PRD 5.1).
 */
const stats = hudStore.state;

const remaining = computed(() => stats.stats?.secondsRemaining ?? 33);
const spooling = computed(() => stats.stats?.cyclePhase === 'spooling');
const label = computed(() => {
  const phase = stats.stats?.cyclePhase;
  if (phase === 'spooling') return 'Spooling';
  if (phase === 'jumping') return 'Jumping';
  if (phase === 'recovering') return 'Recovering';
  return `Cycle ${String(stats.stats?.cycleIndex ?? 1)}`;
});
</script>

<template>
  <div class="clock" data-testid="cycle-clock">
    <p class="label">{{ label }}</p>
    <p class="seconds" data-testid="seconds-remaining" :class="{ urgent: spooling }">
      {{ remaining }}
    </p>
    <div class="spool" aria-hidden="true">
      <div class="spool-fill" :style="{ transform: `scaleX(${stats.stats?.spoolProgress ?? 0})` }" />
    </div>
  </div>
</template>

<style scoped>
.clock {
  pointer-events: none;
  min-width: 72px;
  text-align: center;
  font-family: ui-monospace, monospace;
  color: #cfe8d8;
  text-shadow: 0 1px 0 #000;
}

.label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7fd6a0;
}

.seconds {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.seconds.urgent {
  color: #ffb454;
}

.spool {
  margin: 4px auto 0;
  width: 56px;
  height: 3px;
  background: rgb(47 74 58 / 70%);
  overflow: hidden;
}

.spool-fill {
  height: 100%;
  width: 100%;
  background: #7fd6a0;
  transform-origin: left center;
  transform: scaleX(0);
}

@media (prefers-reduced-motion: reduce) {
  .spool-fill {
    transition: none;
  }
}
</style>
