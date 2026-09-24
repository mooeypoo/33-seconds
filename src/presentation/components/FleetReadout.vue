<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';

/**
 * The run's real health (PRD 7). A percentage plus ten pips, so colour is never the only cue.
 * No flicker: a hit already has the orange stray tell (PRD 15).
 */
const state = hudStore.state;

const integrity = computed(() => state.hud?.fleetIntegrity ?? 100);
const integrityMax = computed(() => state.hud?.fleetIntegrityMax ?? 100);
const percent = computed(() => {
  const max = integrityMax.value;
  if (max <= 0) return 0;
  return Math.round((integrity.value / max) * 100);
});
const filledPips = computed(() => Math.round(integrity.value / 10));
</script>

<template>
  <div class="fleet" data-testid="fleet-readout">
    <p class="line">
      <span class="label">Fleet health</span>
      <span class="value" data-testid="fleet">{{ percent }}%</span>
    </p>
    <div class="pips" aria-hidden="true">
      <span v-for="n in 10" :key="n" class="pip" :class="{ filled: n <= filledPips }" />
    </div>
  </div>
</template>

<style scoped>
.fleet {
  pointer-events: none;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  font-family: ui-monospace, monospace;
  color: #cfe8d8;
  text-shadow: 0 1px 0 #000;
}

.line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  white-space: nowrap;
}

.label {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4fe19a;
}

.value {
  margin: 0;
  font-size: 18px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: #b8ffdc;
}

.pips {
  display: flex;
  gap: 2px;
}

.pip {
  flex: 1;
  height: 4px;
  background: rgb(47 74 58 / 70%);
}

.pip.filled {
  background: #7fd6a0;
}
</style>
