<script setup lang="ts">
/**
 * The run is over: Fleet Integrity reached zero (PRD 5.3). Placeholder copy. No timer.
 * Retry-from-last-jump still waits. Viper Pilot numbers can reach this screen.
 */
const emit = defineEmits<{ continue: [] }>();
</script>

<template>
  <div class="lost">
    <div class="panel" data-ui>
      <h2>The fleet did not make it</h2>
      <p>Placeholder defeat. Fleet Integrity reached zero. Your Viper cannot end the run; the civilians can.</p>
      <button data-ui type="button" data-testid="continue-lose" @click="emit('continue')">Retry</button>
    </div>
  </div>
</template>

<style scoped>
.lost {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgb(var(--rgb-ink) / 55%);
}

.panel {
  pointer-events: auto;
  max-width: 280px;
  padding: 20px 22px;
  background: rgb(var(--rgb-panel) / 92%);
  border: 1px solid var(--color-loss-border);
  color: var(--color-text-warm);
  font-family: var(--font-body);
  text-align: center;
}

h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

p {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-loss-muted);
}

button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 18px;
  font-size: 16px;
  color: var(--color-space);
  background: var(--color-loss);
  border: 0;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--color-text-warm);
  outline-offset: 3px;
}
</style>
