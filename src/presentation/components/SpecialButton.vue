<script setup lang="ts">
import { computed, inject } from 'vue';
import { SPECIAL_PRESS_KEY } from '../injection';
import { hudStore } from '../stores/hudStore';

/**
 * One-handed special (PRD 8.3, 13.2). Opposite corner from the missile button. data-ui so the
 * stick ignores this pointer.
 */
const pressSpecial = inject(SPECIAL_PRESS_KEY);
if (!pressSpecial) throw new Error('SpecialButton needs SPECIAL_PRESS_KEY from main.ts');

const label = computed(() => {
  const hud = hudStore.state.hud;
  if (!hud) return '—';
  if (hud.speechActive) return `${hud.speechRemainingSeconds.toFixed(1)}s`;
  if (hud.speechReady) return 'ready';
  return `${String(hud.speechJumpsUntilReady)} jumps`;
});
</script>

<template>
  <button
    data-ui
    class="special"
    type="button"
    data-testid="fire-special"
    aria-label="The Speech"
    @pointerdown.prevent="pressSpecial"
  >
    speech<br />
    <span data-testid="speech-status">{{ label }}</span>
  </button>
</template>

<style scoped>
.special {
  position: absolute;
  left: max(8px, env(safe-area-inset-left));
  bottom: max(12px, env(safe-area-inset-bottom));
  pointer-events: auto;
  min-width: 72px;
  min-height: 56px;
  padding: 8px 10px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.3;
  color: #0b0f14;
  background: #c6ced8;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.special:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
