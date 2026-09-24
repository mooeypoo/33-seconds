<script setup lang="ts">
import { computed } from 'vue';
import type { CommsLine } from '../../application/banter/Banter';
import { effectiveReducedEffects } from '../../application/playerSettings';
import { hudStore } from '../stores/hudStore';
import { settingsStore } from '../stores/settingsStore';
import { portraitPose, portraitSrc } from '../portraits';

const props = defineProps<{ comms: CommsLine; embedded?: boolean; docked?: boolean }>();

/** Captured once. The in-game toggle still updates through the settings store (PRD 15). */
const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pose = computed(() =>
  portraitPose(
    hudStore.state.hud?.tickCount ?? 0,
    effectiveReducedEffects(osReduced, settingsStore.state.snapshot.reducedEffects),
  ),
);

const speakerSrc = computed(() => portraitSrc(props.comms.speakerName, pose.value));
/** The other person in a scene is not the one talking, so the mouth stays shut. */
const partnerSrc = computed(() =>
  props.comms.partnerName ? portraitSrc(props.comms.partnerName, 'closed') : null,
);
const initial = computed(() => props.comms.speakerName.slice(0, 1));
const partnerInitial = computed(() => props.comms.partnerName?.slice(0, 1) ?? '');
</script>

<template>
  <!-- Not data-ui: a touch here still steers (PRD 12.2). -->
  <p class="comms" :class="{ embedded, docked }" data-testid="comms" role="status" aria-live="polite">
    <img
      v-if="partnerSrc"
      class="portrait partner"
      :src="partnerSrc"
      alt=""
      width="64"
      height="64"
    />
    <span v-else-if="comms.partnerName" class="portrait partner letter" aria-hidden="true">{{
      partnerInitial
    }}</span>
    <img v-if="speakerSrc" class="portrait" :src="speakerSrc" alt="" width="64" height="64" />
    <span v-else class="portrait letter" aria-hidden="true">{{ initial }}</span>
    <span class="body">
      <span class="name">{{ comms.speakerName }}</span>
      <span class="text">{{ comms.text }}</span>
    </span>
  </p>
</template>

<style scoped>
.comms {
  /* Under the playfield. A touch here still steers, and the strip height does not follow the text (PRD 12.2). */
  position: absolute;
  z-index: 4;
  top: max(8px, env(safe-area-inset-top));
  left: max(8px, env(safe-area-inset-left));
  right: max(8px, env(safe-area-inset-right));
  margin: 0;
  pointer-events: none;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 8px;
  color: #e8d8cf;
  background: rgb(8 12 16 / 88%);
  border-left: 3px solid #c4b08a;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.35;
}

.portrait {
  flex: none;
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.letter {
  display: grid;
  place-items: center;
  color: #06110c;
  background: #c4b08a;
  font-family: ui-monospace, monospace;
  font-size: 16px;
}

.partner {
  opacity: 0.55;
}

.embedded,
.docked {
  position: static;
  z-index: auto;
  top: auto;
  left: auto;
  right: auto;
  width: 100%;
  box-sizing: border-box;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: #7fd6a0;
}

.text {
  overflow-wrap: anywhere;
}
</style>
