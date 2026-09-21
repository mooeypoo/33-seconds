<script setup lang="ts">
/**
 * The run is over: the resurrection ship is gone and the last Raiders are clear (PRD 5.3).
 * Placeholder copy. No timer on this screen.
 */
const emit = defineEmits<{ continue: [] }>();
</script>

<template>
  <div class="won">
    <div class="panel" data-ui>
      <h2>The download is offline</h2>
      <p>Placeholder victory. The resurrection ship is gone, and the last Raiders are clear.</p>
      <button data-ui type="button" data-testid="continue-win" @click="emit('continue')">Continue</button>
    </div>
  </div>
</template>

<style scoped>
.won {
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
