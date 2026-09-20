<script setup lang="ts">
/**
 * Recovering: invulnerable calm after a jump (PRD 5.1). There is no timer on this screen. Upgrade
 * cards and the comms scene arrive later; Continue is the stand-in for "the pick is chosen."
 */
const emit = defineEmits<{ continue: [] }>();
</script>

<template>
  <div class="recovering">
    <div class="panel" data-ui>
      <h2>Jump complete</h2>
      <p>Placeholder recovering. Cards and a comms scene come later. No timer on this screen.</p>
      <button data-ui type="button" data-testid="continue-jump" @click="emit('continue')">Continue</button>
    </div>
  </div>
</template>

<style scoped>
.recovering {
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
  border: 1px solid #2c4a3a;
  color: #cfe8d8;
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
  color: #9bb8a8;
}

button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 18px;
  font-size: 16px;
  color: #0b0f14;
  background: #7fd6a0;
  border: 0;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
