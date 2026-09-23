<script setup lang="ts">
/**
 * Placeholder comms for The Speech (PRD 8.3). Labeled fake text. No timer on a decision.
 * Portrait and real lines wait. pointer-events none: this is not a control.
 */
defineProps<{ docked?: boolean }>();
</script>

<template>
  <p class="banner" :class="{ docked }" role="status" data-testid="speech-banner">
    PLACEHOLDER: The Speech. Adama is talking. Raiders hover. You cannot be hit.
  </p>
</template>

<style scoped>
.banner {
  position: absolute;
  top: max(52px, calc(env(safe-area-inset-top) + 44px));
  right: 12px;
  left: 12px;
  margin: 0;
  pointer-events: none;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.35;
  text-align: center;
  color: #e8d8cf;
  text-shadow: 0 1px 2px #000;
}

.docked {
  position: static;
  top: auto;
  right: auto;
  left: auto;
  text-align: left;
}
</style>
