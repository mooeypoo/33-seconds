<script setup lang="ts">
/**
 * Master volume (PRD 14.1). The number is written out, so the level never depends on reading the
 * slider's fill. Separate music and effects volumes wait for the full settings screen.
 */
import { computed } from 'vue';
import { settingsStore } from '../stores/settingsStore';

const percent = computed(() => Math.round(settingsStore.state.snapshot.volume * 100));

function onInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value);
  settingsStore.setVolume(value / 100);
}
</script>

<template>
  <label data-ui class="volume">
    <span class="label">Volume {{ percent }}%</span>
    <input class="slider" type="range" min="0" max="100" step="5" :value="percent" @input="onInput" />
  </label>
</template>

<style scoped>
.volume {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 160px;
  font-size: 14px;
  color: var(--color-text);
}

.slider {
  width: 100%;
  min-height: 44px;
  accent-color: var(--color-dradis-soft);
  cursor: pointer;
}

.slider:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
