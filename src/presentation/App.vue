<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import type { SessionStatus } from '../application/GameSession';
import { CANVAS_HOST_KEY, SESSION_KEY } from './injection';
import DragHint from './components/DragHint.vue';
import HudBar from './components/HudBar.vue';
import PauseOverlay from './components/PauseOverlay.vue';
import TitleOverlay from './components/TitleOverlay.vue';

const session = inject(SESSION_KEY);
const mountCanvas = inject(CANVAS_HOST_KEY);
if (!session || !mountCanvas) throw new Error('App.vue needs a session and a canvas host from main.ts');

const canvasHost = useTemplateRef<HTMLElement>('canvasHost');
const status = ref<SessionStatus>(session.status);
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

  <DragHint v-if="status.phase === 'running'" />

  <TitleOverlay v-if="status.phase === 'title'" @start="session.start()" />

  <PauseOverlay
    v-else-if="status.phase === 'paused' || status.phase === 'resuming'"
    :status="status"
    @resume="session.requestResume()"
  />
</template>

<style scoped>
.canvas-host {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
