<script setup lang="ts">
import { computed, inject } from 'vue';
import { SPECIAL_PRESS_KEY } from '../injection';
import { hudStore } from '../stores/hudStore';

/**
 * One-handed special (PRD 8.3, 13.2). Opposite corner from the missile button. data-ui so the
 * stick ignores this pointer.
 */
defineProps<{ disabled?: boolean }>();

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
    :disabled="disabled"
    data-testid="fire-special"
    data-lesson-target="speech"
    aria-label="The Speech"
    @pointerdown.prevent="pressSpecial"
  >
    speech<br />
    <span data-testid="speech-status">{{ label }}</span>
  </button>
</template>

<style scoped>
.special {
  /* In the strip under the lane, not on the playfield, so it never covers the fleet (ADR-0002 1.4). */
  flex: none;
  align-self: center;
  pointer-events: auto;
  min-width: 64px;
  min-height: 56px;
  padding: 8px 10px;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 12px;
  line-height: 1.3;
  color: var(--color-space);
  background: var(--color-gunmetal-light);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.special:disabled {
  opacity: 0.45;
  cursor: default;
}

.special:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
