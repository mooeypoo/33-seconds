<script setup lang="ts">
/**
 * Ready for the first sound (PRD 14.1). Nothing mounts it until then: the title, the HUD, and
 * pause stay quiet while Phaser boots with noAudio. The muted flag in player settings is unchanged.
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
