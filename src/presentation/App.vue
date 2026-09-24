<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, watchEffect } from 'vue';
import type { SessionStatus } from '../application/GameSession';
import { playfieldForWindow } from '../application/playfield';
import type { TierId } from '../domain/balance/profile';
import { CANVAS_HOST_KEY, RESIZE_PLAYFIELD_KEY, SESSION_KEY } from './injection';
import AboutSheet from './components/AboutSheet.vue';
import CommsOverlay from './components/CommsOverlay.vue';
import CycleClock from './components/CycleClock.vue';
import DragHint from './components/DragHint.vue';
import FleetReadout from './components/FleetReadout.vue';
import HudBar from './components/HudBar.vue';
import JumpFade from './components/JumpFade.vue';
import LatestUpgrade from './components/LatestUpgrade.vue';
import ObjectiveLine from './components/ObjectiveLine.vue';
import PauseOverlay from './components/PauseOverlay.vue';
import RecoveringOverlay from './components/RecoveringOverlay.vue';
import TitleOverlay from './components/TitleOverlay.vue';
import WinOverlay from './components/WinOverlay.vue';
import LoseOverlay from './components/LoseOverlay.vue';
import MissileButton from './components/MissileButton.vue';
import SpecialButton from './components/SpecialButton.vue';
import SpeechBanner from './components/SpeechBanner.vue';
import StatusRow from './components/StatusRow.vue';
import { hudStore } from './stores/hudStore';
import { settingsStore } from './stores/settingsStore';

const session = inject(SESSION_KEY);
const mountCanvas = inject(CANVAS_HOST_KEY);
const resizePlayfield = inject(RESIZE_PLAYFIELD_KEY);
if (!session || !mountCanvas) throw new Error('App.vue needs a session and a canvas host from main.ts');

const canvasHost = useTemplateRef<HTMLElement>('canvasHost');
const status = ref<SessionStatus>(session.status);
const cyclePhase = computed(() => hudStore.state.hud?.cyclePhase ?? null);
const inRun = computed(() => status.value.phase !== 'title');
const showFleet = computed(
  () => status.value.phase === 'running' || status.value.phase === 'paused' || status.value.phase === 'resuming',
);
/**
 * Missile and Speech buttons are for touch. A keyboard already has Space and E, and on a desktop
 * the buttons only covered the fleet (ADR-0002 1.4). Read once: a device does not change mid-run.
 */
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const inCombat = computed(
  () => status.value.phase === 'running' && cyclePhase.value !== 'recovering' && cyclePhase.value !== 'jumping',
);
/** About is a pause with the how-to sheet, not the pause menu. */
const aboutOpen = ref(false);
let unsubscribe: (() => void) | null = null;

function beginRun(tier: TierId): void {
  const playfield = playfieldForWindow(window.innerWidth);
  session?.start(tier, playfield);
  resizePlayfield?.(playfield.width);
}

function openAbout(): void {
  if (session?.status.choosingUpgrade) return;
  aboutOpen.value = true;
  session?.pause('player');
}

function closeAbout(): void {
  aboutOpen.value = false;
  if (session?.status.phase === 'paused') session.requestResume();
}

watch(
  () => status.value.phase,
  (phase) => {
    if (phase !== 'paused') aboutOpen.value = false;
  },
);

// Phaser refits the canvas only on window resize. Starting a run adds the bands around the
// playfield, so the scale manager has to be told the parent changed.
watch(inRun, () => {
  void nextTick(() => {
    window.dispatchEvent(new Event('resize'));
  });
});

// The readable font swaps the display face everywhere through one class (PRD 14, 15).
watchEffect(() => {
  document.documentElement.classList.toggle('readable-font', settingsStore.state.snapshot.readableFont);
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
        <CycleClock v-if="showFleet" />
        <HudBar
          :phase="status.phase"
          :allow-pause="!status.choosingUpgrade"
          @pause="session.pause('player')"
          @about="openAbout"
        />
      </div>
      <div v-if="showFleet" class="detail-row">
        <StatusRow />
        <LatestUpgrade />
      </div>
      <ObjectiveLine v-if="showFleet && !status.choosingUpgrade" />
    </header>
    <div class="play">
      <div ref="canvasHost" class="canvas-host" aria-hidden="true" />
      <RecoveringOverlay v-if="status.choosingUpgrade" />
      <DragHint v-if="inCombat" />
    </div>
    <footer v-if="inRun" class="bottom-band">
      <SpecialButton v-if="isTouch && showFleet" :disabled="!inCombat" />
      <div class="comms-slot">
        <CommsOverlay v-if="status.comms" docked :comms="status.comms" />
        <SpeechBanner v-if="status.phase === 'running' && hudStore.state.hud?.speechActive" docked />
      </div>
      <MissileButton v-if="isTouch && showFleet" :disabled="!inCombat" />
    </footer>
  </div>

  <TitleOverlay v-if="status.phase === 'title'" @start="beginRun" />

  <WinOverlay v-else-if="status.phase === 'won'" @continue="session.returnToTitle()" />

  <LoseOverlay v-else-if="status.phase === 'lost'" @continue="session.returnToTitle()" />

  <JumpFade v-else-if="status.phase === 'running' && cyclePhase === 'jumping'" />

  <AboutSheet v-if="aboutOpen && status.phase === 'paused'" @resume="closeAbout" />

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
.bottom-band,
.shell.in-run .play {
  /* Top controls plus a fixed dialogue strip under the playfield. */
  /* Room for the top band (fleet, clock, status, objective) and the comms strip. */
  width: min(100%, calc((100dvh - 260px) * 324 / 480));
}

.top-band {
  position: relative;
  z-index: 3;
  container: topband / inline-size;
  background: var(--color-space);
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
  justify-content: space-between;
  gap: 10px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottom-band {
  flex: none;
  /* Fixed, so a longer line wraps inside the strip instead of resizing the playfield. */
  height: 120px;
  box-sizing: border-box;
  z-index: 3;
  overflow: hidden;
  background: var(--color-space);
  padding: 8px 10px max(8px, env(safe-area-inset-bottom));
  /* On touch, Speech and Missile flank the comms line: thumbs at the bottom corners (PRD 13.2). */
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
}

.comms-slot {
  flex: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
}

.play {
  position: relative;
  min-height: 0;
  /* Matches the canvas, so a one- or two-pixel 9:16 remainder does not read as a frame. */
  background: var(--color-space);
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

/* A phone is already a portrait. The column uses the screen width instead of a
   height-derived 9:16 that leaves the game as a thin strip. */
@media (max-width: 800px) {
  .shell.in-run {
    align-items: stretch;
  }

  .top-band,
  .bottom-band,
  .shell.in-run .play {
    width: 100%;
  }

  .bottom-band {
    /* 64px portrait plus its own padding. Shorter than the desktop strip so the
       9:16 canvas can reach the screen edges instead of pillarboxing. */
    height: calc(90px + env(safe-area-inset-bottom));
    padding: 4px 10px max(4px, env(safe-area-inset-bottom));
  }
}
</style>
