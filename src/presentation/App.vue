<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import type { SessionStatus } from '../application/GameSession';
import { CANVAS_HOST_KEY, SESSION_KEY } from './injection';
import DragHint from './components/DragHint.vue';
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
let unsubscribe: (() => void) | null = null;

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
  <div ref="canvasHost" class="canvas-host" aria-hidden="true" />

  <HudBar :phase="status.phase" @pause="session.pause('player')" />

  <MissileButton
    v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'"
  />

  <SpecialButton
    v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'"
  />

  <SpeechBanner v-if="status.phase === 'running' && hudStore.state.stats?.speechActive" />

  <DragHint v-if="status.phase === 'running' && cyclePhase !== 'recovering' && cyclePhase !== 'jumping'" />

  <TitleOverlay v-if="status.phase === 'title'" @start="session.start($event)" />

  <WinOverlay v-else-if="status.phase === 'won'" @continue="session.returnToTitle()" />

  <LoseOverlay v-else-if="status.phase === 'lost'" @continue="session.returnToTitle()" />

  <JumpFade v-else-if="status.phase === 'running' && cyclePhase === 'jumping'" />

  <RecoveringOverlay v-else-if="status.phase === 'running' && cyclePhase === 'recovering'" />

  <PauseOverlay
    v-else-if="status.phase === 'paused' || status.phase === 'resuming'"
    :status="status"
    @resume="session.requestResume()"
    @abandon="session.abandonRun()"
  />
</template>

<style scoped>
.canvas-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
