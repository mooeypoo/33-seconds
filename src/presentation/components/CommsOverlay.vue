<script setup lang="ts">
import { computed } from 'vue';
import type { CommsLine } from '../../application/banter/Banter';

const props = defineProps<{ comms: CommsLine }>();

/** The letter is a stand-in portrait. The name next to it is the cue, not the color. */
const initial = computed(() => props.comms.speakerName.slice(0, 1));
</script>

<template>
  <!-- Not data-ui: a touch here still steers (PRD 12.2). -->
  <p class="comms" data-testid="comms" role="status" aria-live="polite">
    <span class="portrait" aria-hidden="true">{{ initial }}</span>
    <span class="body">
      <span class="name">{{ comms.speakerName }}</span>
      <span class="text">{{ comms.text }}</span>
    </span>
  </p>
</template>

<style scoped>
.comms {
  position: absolute;
  top: max(108px, calc(env(safe-area-inset-top) + 100px));
  left: max(12px, env(safe-area-inset-left));
  /* Stay off the mute and pause column. */
  max-width: min(68%, 280px);
  margin: 0;
  pointer-events: none;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px;
  color: #e8d8cf;
  background: rgb(8 12 16 / 82%);
  border: 1px solid #3a4a44;
  border-radius: 6px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.35;
}

.portrait {
  flex: none;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  color: #06110c;
  background: #c4b08a;
  font-family: ui-monospace, monospace;
  font-size: 16px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #7fd6a0;
}

.text {
  overflow-wrap: anywhere;
}
</style>
