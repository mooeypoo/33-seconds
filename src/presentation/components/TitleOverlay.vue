<script setup lang="ts">
import type { TierId } from '../../domain/balance/profile';

const emit = defineEmits<{ start: [tier: TierId] }>();
</script>

<template>
  <!-- data-ui: this is a real control, so a touch here is a button press, not the drag stick. -->
  <div data-ui class="overlay">
    <h1 class="title">33 Seconds</h1>
    <p class="subtitle">
      Two difficulties. They look the same; only the fleet math changes. Viper Pilot can lose.
      Civilian Run cannot die from a bad 33.
    </p>

    <button class="start" type="button" @click="emit('start', 'viper-pilot')">Launch — Viper Pilot</button>
    <p class="tier-note">Default. Ignore the civilians long enough and they are gone.</p>
    <button class="civilian" type="button" @click="emit('start', 'civilian-ship')">Civilian Run</button>
    <p class="tier-note">Same fight. The fleet holds together better. Not a tutorial.</p>

    <p class="hint">
      Move with WASD, the arrow keys, or by dragging anywhere. Missiles with Space or the button.
      The Speech with E or the other button. At each jump, pick a card. Pause with Esc, P, or the
      button.
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
.disclaimer,
.tier-note {
  max-width: 34ch;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #9fb8ab;
}

.tier-note {
  font-size: 12px;
  margin-top: -4px;
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

.start:focus-visible,
.civilian:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}

.civilian {
  min-width: 160px;
  min-height: 44px;
  font: inherit;
  font-size: 15px;
  color: #cfe8d8;
  background: transparent;
  border: 1px solid #2c4a3a;
  border-radius: 8px;
  cursor: pointer;
}
</style>
