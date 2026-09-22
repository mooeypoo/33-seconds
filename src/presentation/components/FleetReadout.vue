<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';

/**
 * The run's real health (PRD 7). Ten pips plus a number, so colour is never the only cue.
 * No flicker: a hit already has the orange stray tell (PRD 15).
 */
const stats = hudStore.state;

const integrity = computed(() => stats.stats?.fleet ?? 100);
const integrityMax = computed(() => stats.stats?.fleetMax ?? 100);
const filledPips = computed(() => Math.round(integrity.value / 10));
</script>

<template>
  <div class="fleet" data-testid="fleet-readout">
    <p class="label">{{ stats.stats?.tier === 'viper-pilot' ? 'Fleet · Pilot' : 'Fleet · Civilian' }}</p>
    <p class="value" data-testid="fleet">{{ integrity }}/{{ integrityMax }}</p>
    <div class="pips" aria-hidden="true">
      <span v-for="n in 10" :key="n" class="pip" :class="{ filled: n <= filledPips }" />
    </div>
  </div>
</template>

<style scoped>
.fleet {
  pointer-events: none;
  min-width: 88px;
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

.value {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.pips {
  display: flex;
  justify-content: center;
  gap: 2px;
  margin-top: 4px;
}

.pip {
  width: 5px;
  height: 6px;
  background: rgb(47 74 58 / 70%);
}

.pip.filled {
  background: #7fd6a0;
}
</style>
