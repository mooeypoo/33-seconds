<script setup lang="ts">
import { computed } from 'vue';
import { hudStore } from '../stores/hudStore';
import { settingsStore } from '../stores/settingsStore';

/**
 * Tells a new player on a touch device that dragging flies the Viper (PRD 13.2). The stick's ring
 * only appears once a finger is already down, so without this nobody knows to put one down.
 *
 * It is text, not a modal: no timer, no button, nothing to dismiss. The first drag removes it.
 */
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

const visible = computed(
  () => isTouchDevice && !hudStore.state.dragHintDismissed && !settingsStore.state.snapshot.dragHintSeen,
);
</script>

<template>
  <!-- Not data-ui: a touch that lands here must still steer, which is the whole point. -->
  <p v-if="visible" class="hint" role="status">Drag anywhere to fly</p>
</template>

<style scoped>
.hint {
  position: absolute;
  right: 0;
  /* Above the corner buttons, which sit on the bottom edge of the playfield. */
  bottom: 76px;
  left: 0;
  margin: 0;
  /* Transparent to pointer input, like the rest of the HUD layer. */
  pointer-events: none;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 15px;
  color: var(--color-text);
  text-align: center;
  text-shadow: 0 1px 2px var(--color-shadow);
}
</style>
