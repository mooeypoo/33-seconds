<script setup lang="ts">
const emit = defineEmits<{ start: [] }>();
</script>

<template>
  <!-- data-ui: this is a real control, so a touch here is a button press, not the drag stick. -->
  <div data-ui class="overlay">
    <h1 class="title">33 Seconds</h1>
    <p class="subtitle">Placeholder title screen. Art, logo, and jokes come later.</p>

    <button class="start" type="button" @click="emit('start')">Launch</button>

    <p class="hint">
      Move with WASD, the arrow keys, or by dragging anywhere. Missiles with Space or the button.
      Pause with Esc, P, or the button.
    </p>
    <p class="disclaimer">
      Unofficial fan project. Not affiliated with or endorsed by the show's rights holders or anyone
      in the cast.
    </p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  background: rgb(5 7 10 / 88%);
  color: #cfe8d8;
  font-family: ui-monospace, monospace;
}

.title {
  margin: 0;
  font-size: clamp(28px, 8vw, 48px);
  letter-spacing: 0.08em;
}

.subtitle,
.hint,
.disclaimer {
  max-width: 34ch;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #9fb8ab;
}

.disclaimer {
  font-size: 12px;
}

.start {
  min-width: 160px;
  min-height: 48px;
  font: inherit;
  font-size: 18px;
  color: #06110c;
  background: #7fd6a0;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.start:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
