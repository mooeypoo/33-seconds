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
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgb(8 12 16 / 55%);
}

.panel {
  pointer-events: auto;
  max-width: 280px;
  padding: 20px 22px;
  background: rgb(12 20 28 / 92%);
  border: 1px solid #5a3a2c;
  color: #e8d8cf;
  font-family: ui-sans-serif, system-ui, sans-serif;
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
  color: #b89b9b;
}

button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 18px;
  font-size: 16px;
  color: #0b0f14;
  background: #d67f7f;
  border: 0;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid #e8d8cf;
  outline-offset: 3px;
}
</style>
