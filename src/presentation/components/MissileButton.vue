<script setup lang="ts">
import { computed, inject } from 'vue';
import { MISSILE_PRESS_KEY } from '../injection';
import { hudStore } from '../stores/hudStore';

/**
 * One-handed missile fire (PRD 8.2, 13.2). data-ui so the stick ignores this pointer. Second
 * finger on the play area still latches a missile too.
 */
defineProps<{ disabled?: boolean }>();

const pressMissile = inject(MISSILE_PRESS_KEY);
if (!pressMissile) throw new Error('MissileButton needs MISSILE_PRESS_KEY from main.ts');

const ammo = computed(() => {
  const hud = hudStore.state.hud;
  if (!hud) return '—';
  return `${String(hud.missiles)}/${String(hud.missilesMax)}`;
});
</script>

<template>
  <button
    data-ui
    class="missile"
    type="button"
    :disabled="disabled"
    data-testid="fire-missile"
    data-lesson-target="missile"
    aria-label="Fire missile"
    @pointerdown.prevent="pressMissile"
  >
    missile<br />
    <span data-testid="missile-ammo">{{ ammo }}</span>
  </button>
</template>

<style scoped>
.missile {
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
  background: var(--color-dradis-soft);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.missile:disabled {
  opacity: 0.45;
  cursor: default;
}

.missile:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
