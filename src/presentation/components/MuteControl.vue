<script setup lang="ts">
import { settingsStore } from '../stores/settingsStore';

defineProps<{ compact?: boolean }>();
</script>

<template>
  <button
    data-ui
    class="mute"
    :class="{ compact }"
    type="button"
    :aria-pressed="settingsStore.state.snapshot.muted"
    :aria-label="settingsStore.state.snapshot.muted ? 'Unmute' : 'Mute'"
    @click="settingsStore.toggleMuted()"
  >
    {{ settingsStore.state.snapshot.muted ? 'Muted' : 'Sound on' }}
  </button>
</template>

<style scoped>
.mute {
  pointer-events: auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  font: inherit;
  font-size: 14px;
  color: #cfe8d8;
  background: rgb(12 20 28 / 80%);
  border: 1px solid #2c4a3a;
  border-radius: 6px;
  cursor: pointer;
}

.mute.compact {
  font-size: 13px;
}

.mute:focus-visible {
  outline: 2px solid #7fd6a0;
  outline-offset: 2px;
}
</style>
