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
  border: 1px solid var(--color-dradis-line);
  color: var(--color-text);
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
  color: var(--color-text-muted);
}

button {
  min-width: 44px;
  min-height: 44px;
  padding: 0 18px;
  font-size: 16px;
  color: var(--color-space);
  background: var(--color-dradis-soft);
  border: 0;
  cursor: pointer;
}

button:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
