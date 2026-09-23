<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { SessionStatus } from '../application/GameSession';
import { CANVAS_HOST_KEY, SESSION_KEY } from './injection';
import CommsOverlay from './components/CommsOverlay.vue';
import DragHint from './components/DragHint.vue';
import FleetReadout from './components/FleetReadout.vue';
import HudBar from './components/HudBar.vue';
import JumpFade from './components/JumpFade.vue';
import PauseOverlay from './components/PauseOverlay.vue';
import RecoveringOverlay from './components/RecoveringOverlay.vue';
import TitleOverlay from './components/TitleOverlay.vue';
import WinOverlay from './components/WinOverlay.vue';
import LoseOverlay from './components/LoseOverlay.vue';
import MissileButton from './components/MissileButton.vue';
import SpecialButton from './components/SpecialButton.vue';
import SpeechBanner from './components/SpeechBanner.vue';
import { hudStore } from './stores/hudStore';

const session = inject(SESSION_KEY);
const mountCanvas = inject(CANVAS_HOST_KEY);
if (!session || !mountCanvas) throw new Error('App.vue needs a session and a canvas host from main.ts');

const canvasHost = useTemplateRef<HTMLElement>('canvasHost');
const status = ref<SessionStatus>(session.status);
const cyclePhase = computed(() => hudStore.state.stats?.cyclePhase ?? null);
const inRun = computed(() => status.value.phase !== 'title');
const showFleet = computed(
  () => status.value.phase === 'running' || status.value.phase === 'paused' || status.value.phase === 'resuming',
);
let unsubscribe: (() => void) | null = null;

// Phaser refits the canvas only on window resize. Starting a run shortens the play column
// to leave a band above it, so the scale manager has to be told the parent changed.
watch(inRun, () => {
  void nextTick(() => {
    window.dispatchEvent(new Event('resize'));
  });
});

onMounted(() => {
  unsubscribe = session.subscribe((next) => {
    status.value = next;
  });
  if (canvasHost.value) mountCanvas(canvasHost.value);
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>

<template>
  <!-- Overlays sit above the canvas and are transparent to pointer input unless marked data-ui. -->
  <div class="shell" :class="{ 'in-run': inRun }">
    <header v-if="inRun" class="top-band">
      <div class="status-row">
        <FleetReadout v-if="showFleet" />
        <div class="comms-slot">
          <CommsOverlay v-if="status.comms" docked :comms="status.comms" />
          <SpeechBanner v-if="status.phase === 'running' && hudStore.state.stats?.speechActive" docked />
        </div>
        <HudBar :phase="status.phase" @pause="session.pause('player')" />
      </div>
    </header>
    <div class="play">
      <div ref="canvasHost" class="canvas-host" aria-hidden="true" />
      <RecoveringOverlay
        v-if="status.phase === 'running' && cyclePhase === 'recovering'"
        :held-card-id="status.heldCardId"
      />
    </div>
  </div>

  <MissileButton
    v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'"
  />

  <SpecialButton
    v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'"
  />

  <DragHint v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'" />

  <TitleOverlay v-if="status.phase === 'title'" @start="session.start($event)" />

  <WinOverlay v-else-if="status.phase === 'won'" @continue="session.returnToTitle()" />

  <LoseOverlay v-else-if="status.phase === 'lost'" @continue="session.returnToTitle()" />

  <JumpFade v-else-if="status.phase === 'running' && cyclePhase === 'jumping'" />

  <PauseOverlay
    v-else-if="status.phase === 'paused' || status.phase === 'resuming'"
    :status="status"
    @resume="session.requestResume()"
    @abandon="session.abandonRun()"
  />

</template>

<style scoped>
.shell {
  position: absolute;
  inset: 0;
}

.shell.in-run {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.top-band,
.shell.in-run .play {
  /* Matches a portrait playfield under a band of about this height. */
  width: min(100%, calc((100dvh - 120px) * 270 / 480));
}

.top-band {
  position: relative;
  z-index: 3;
  background: #0b0e14;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  padding: max(8px, env(safe-area-inset-top)) 10px 8px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.comms-slot {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.play {
  position: relative;
  min-height: 0;
}

.shell.in-run .play {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.shell:not(.in-run) .play {
  position: absolute;
  inset: 0;
  width: auto;
}

.shell.in-run .canvas-host {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
}

.shell:not(.in-run) .canvas-host {
  position: absolute;
  inset: 0;
}

.canvas-host {
  pointer-events: none;
}
</style>
