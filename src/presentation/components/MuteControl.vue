<script setup lang="ts">
/**
 * Sound on / Muted, in words (PRD 14.1). On the title beside the sound notice, in the HUD beside
 * Pause (folded under Settings on a narrow band, and still there on the Recovering sheet), and in
 * the pause menu. Muting is instant and total.
 */
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
  color: var(--color-text);
  background: rgb(var(--rgb-panel) / 80%);
  border: 1px solid var(--color-dradis-line);
  border-radius: 6px;
  cursor: pointer;
}

.mute.compact {
  font-size: 13px;
}

.mute:focus-visible {
  outline: 2px solid var(--color-dradis-soft);
  outline-offset: 2px;
}
</style>
