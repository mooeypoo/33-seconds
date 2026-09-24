<script setup lang="ts">
import { computed, inject } from 'vue';
import { MISSILE_PRESS_KEY } from '../injection';
import { hudStore } from '../stores/hudStore';

/**
 * One-handed missile fire (PRD 8.2, 13.2). data-ui so the stick ignores this pointer. Second
 * finger on the play area still latches a missile too.
 */
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
    data-testid="fire-missile"
    aria-label="Fire missile"
    @pointerdown.prevent="pressMissile"
  >
    missile<br />
    <span data-testid="missile-ammo">{{ ammo }}</span>
  </button>
</template>

<style scoped>
.missile {
  position: absolute;
  right: max(8px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  pointer-events: auto;
  min-width: 72px;
  min-height: 56px;
  padding: 8px 10px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.3;
  color: #0b0f14;
  background: #7fd6a0;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.missile:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
