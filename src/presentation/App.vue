<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
  watchEffect,
  type Component,
} from 'vue';
import type { SessionStatus } from '../application/GameSession';
import type { RunResult } from '../application/runResult';
import { lessonFocusBoxes } from '../application/training/lessonFocus';
import { decodeSharedRun, type SharedRun } from '../application/shareCode';
import { challengeLaunch, challengeName, compareWithRival, type RivalComparison } from '../application/challenges';
import { NARROW_LAYOUT_MAX_PX, playfieldForLane, playfieldForWindow } from '../application/playfield';
import type { Playfield } from '../domain/shared/world';
import type { TierId } from '../domain/balance/profile';
import { CANVAS_HOST_KEY, RESIZE_PLAYFIELD_KEY, SESSION_KEY } from './injection';
import AboutSheet from './components/AboutSheet.vue';
import CommsConsole from './components/CommsConsole.vue';
import CommsOverlay from './components/CommsOverlay.vue';
import CycleClock from './components/CycleClock.vue';
import DragHint from './components/DragHint.vue';
import FleetConsole from './components/FleetConsole.vue';
import FleetReadout from './components/FleetReadout.vue';
import HudBar from './components/HudBar.vue';
import JumpFade from './components/JumpFade.vue';
import LatestUpgrade from './components/LatestUpgrade.vue';
import LessonCard from './components/LessonCard.vue';
import PauseOverlay from './components/PauseOverlay.vue';
import RecoveringOverlay from './components/RecoveringOverlay.vue';
import TitleOverlay from './components/TitleOverlay.vue';
import TrainingDebrief from './components/TrainingDebrief.vue';
import RunSummary from './components/RunSummary.vue';
import MissileButton from './components/MissileButton.vue';
import SpecialButton from './components/SpecialButton.vue';
import SpeechBanner from './components/SpeechBanner.vue';
import StatusRow from './components/StatusRow.vue';
import { useCicLayout } from './composables/useLayout';
import { hudStore } from './stores/hudStore';
import { titleQuote } from './titleQuote';
import titleCopy from '../content/title.json';
import { settingsStore } from './stores/settingsStore';
import { GAME_VERSION } from './gameVersion';

/**
 * The Simulate win / lose buttons (DevEndPreview). In `npm run dev` and the Playwright build only:
 * in a production build this is a constant false, so the component and its chunk are left out.
 */
const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG === 'true';
// ESLint cannot read .vue types through a dynamic import; vue-tsc checks the real one.
const DevEndPreview: Component | null = DEV_TOOLS
  ? defineAsyncComponent(() => import('./components/DevEndPreview.vue') as Promise<{ default: Component }>)
  : null;

const session = inject(SESSION_KEY);
const mountCanvas = inject(CANVAS_HOST_KEY);
const resizePlayfield = inject(RESIZE_PLAYFIELD_KEY);
if (!session || !mountCanvas) throw new Error('App.vue needs a session and a canvas host from main.ts');

const canvasHost = useTemplateRef<HTMLElement>('canvasHost');
const status = ref<SessionStatus>(session.status);
const cyclePhase = computed(() => hudStore.state.hud?.cyclePhase ?? null);
/**
 * True for the moment between Launch and the run starting, so the lane can be measured with the
 * run's bands around it. Set and cleared before the browser paints, so nobody sees it.
 */
const launching = ref(false);
const inRun = computed(() => status.value.phase !== 'title' || launching.value);
const showFleet = computed(
  () =>
    launching.value ||
    status.value.phase === 'running' ||
    status.value.phase === 'paused' ||
    status.value.phase === 'resuming',
);
/**
 * Missile and Speech buttons are for touch. A keyboard already has Space and E, and on a desktop
 * the buttons only covered the fleet (ADR-0002 1.4). Read once: a device does not change mid-run.
 */
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const inCombat = computed(
  () => status.value.phase === 'running' && cyclePhase.value !== 'recovering' && cyclePhase.value !== 'jumping',
);
/** Two consoles beside the lane on a wide window; strips above and below it otherwise. */
const cic = useCicLayout();
const quote = titleQuote();
const speaking = computed(() => status.value.phase === 'running' && hudStore.state.hud?.speechActive === true);
/** About is a pause with the how-to sheet, not the pause menu. */
const aboutOpen = ref(false);
/** A run someone shared, opened from the link's hash (PRD 17). Shown over the title. */
const shared = ref<SharedRun | null>(decodeSharedRun(window.location.hash));
/** A made-up run from the dev buttons. Never set in a production build. */
const devPreview = ref<RunResult | null>(null);
/**
 * The shared run this one is trying to beat (PRD 11.1). Held in memory for one run: nothing about
 * it is stored, and any other Launch forgets it.
 */
const rival = ref<RunResult | null>(null);
/** The status row names a challenge while it is played. */
const challengeLabel = computed(() => (status.value.challenge ? challengeName(status.value.challenge) : null));

interface EndScreen {
  readonly result: RunResult;
  readonly gameVersion: string;
  readonly shared: boolean;
  /** A shared challenge this version can play, so it offers Beat this. */
  readonly canBeat: boolean;
  readonly rival: RivalComparison | null;
}

/** What the end screen shows, if anything: this run, a dev preview, or a shared run. */
const endScreen = computed<EndScreen | null>(() => {
  const phase = status.value.phase;
  if ((phase === 'won' || phase === 'lost') && status.value.result) {
    const result = status.value.result;
    const comparison = rival.value ? compareWithRival(result, rival.value) : null;
    return { result, gameVersion: GAME_VERSION, shared: false, canBeat: false, rival: comparison };
  }
  if (phase !== 'title') return null;
  if (devPreview.value) return { result: devPreview.value, gameVersion: GAME_VERSION, shared: false, canBeat: false, rival: null };
  if (shared.value) {
    const key = shared.value.result.challenge?.key;
    return { ...shared.value, shared: true, canBeat: key !== undefined && challengeLaunch(key) !== null, rival: null };
  }
  return null;
});

function leaveEndScreen(): void {
  if (status.value.phase === 'won' || status.value.phase === 'lost') {
    rival.value = null;
    session?.returnToTitle();
    return;
  }
  if (devPreview.value) {
    devPreview.value = null;
    return;
  }
  dropSharedRun();
}

/** Leaving a shared run drops its hash, so a reload shows the title and not the run again. */
function dropSharedRun(): void {
  shared.value = null;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

/** Beat this: the shared run's challenge, with the shared run held to compare at the end. */
function beatSharedRun(): void {
  const run = shared.value?.result;
  const key = run?.challenge?.key;
  if (!run || key === undefined) return;
  dropSharedRun();
  void beginChallenge(key, run);
}

function onHashChange(): void {
  shared.value = decodeSharedRun(window.location.hash);
}
let unsubscribe: (() => void) | null = null;

/**
 * A phone's world is as wide as its lane allows (PRD 13.2), so the lane is measured with the run's
 * bands in place. A wider window keeps its fixed lanes. Chosen once: the run keeps it.
 */
async function playfieldForLaunch(): Promise<Playfield> {
  if (window.innerWidth > NARROW_LAYOUT_MAX_PX || !canvasHost.value) return playfieldForWindow(window.innerWidth);
  launching.value = true;
  await nextTick();
  const lane = canvasHost.value.getBoundingClientRect();
  launching.value = false;
  return playfieldForLane(lane.width, lane.height);
}

async function beginRun(tier: TierId): Promise<void> {
  if (launching.value) return;
  rival.value = null;
  const playfield = await playfieldForLaunch();
  session?.start(tier, playfield);
  resizePlayfield?.(playfield.width);
}

/** A challenge (PRD 11.1), with the run it is trying to beat when it came from Beat this. */
async function beginChallenge(key: string, beat: RunResult | null = null): Promise<void> {
  if (launching.value) return;
  rival.value = beat;
  const playfield = await playfieldForLaunch();
  session?.startChallenge(key, playfield);
  resizePlayfield?.(playfield.width);
}

/** A Training Run: the same lane, with lessons (PRD 5.5). */
async function beginTraining(): Promise<void> {
  if (launching.value) return;
  rival.value = null;
  const playfield = await playfieldForLaunch();
  session?.startTraining(playfield);
  resizePlayfield?.(playfield.width);
}

/** From the debrief straight into a real run. */
function launchAfterTraining(): void {
  session?.returnToTitle();
  void beginRun('viper-pilot');
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
watch([inRun, cic], () => {
  void nextTick(() => {
    window.dispatchEvent(new Event('resize'));
  });
});

// What the lesson on screen is about in the playfield. Read once per lesson: the world is frozen
// while it is up.
const lessonBoxes = computed(() => (status.value.lesson ? lessonFocusBoxes(status.value.lesson, session.view) : []));

// A lesson outlines the HUD elements it is about. One word list on the root, so any layout's copy of
// each element can answer to it (styles.css). Playfield focuses are drawn on the canvas instead.
watchEffect(() => {
  const focus = status.value.lesson?.focus ?? [];
  if (focus.length > 0) document.documentElement.dataset.lessonFocus = focus.join(' ');
  else delete document.documentElement.dataset.lessonFocus;
});

// Finishing the sim once is enough for the title to stop pushing it. It stays on offer.
watch(
  () => status.value.debrief,
  (debrief) => {
    if (debrief) settingsStore.markTrainingCompleted();
  },
);

// The readable font swaps the display face everywhere through one class (PRD 14, 15).
watchEffect(() => {
  document.documentElement.classList.toggle('readable-font', settingsStore.state.snapshot.readableFont);
});

onMounted(() => {
  unsubscribe = session.subscribe((next) => {
    status.value = next;
  });
  if (canvasHost.value) mountCanvas(canvasHost.value);
  window.addEventListener('hashchange', onHashChange);
});

onUnmounted(() => {
  unsubscribe?.();
  window.removeEventListener('hashchange', onHashChange);
});
</script>

<template>
  <!--
    Overlays sit above the canvas and are transparent to pointer input unless marked data-ui.
    The lane (.play and its canvas host) is always the same element: Phaser mounts into it once,
    so the consoles and strips come and go around it, never replace it.
  -->
  <div class="shell" :class="{ 'in-run': inRun, cic }">
    <FleetConsole v-if="cic" class="side" :standby="!showFleet" :names="status.fleetNames">
      <p class="standby-note">{{ titleCopy.disclaimer }}</p>
    </FleetConsole>

    <div class="lane-column">
      <header v-if="inRun && !cic" class="top-band">
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
          <!-- The row keeps one chip's height when empty, so the lane measured at Launch holds. -->
          <StatusRow with-objective :training="status.training" :drill="status.drill" :challenge="challengeLabel" />
          <LatestUpgrade />
        </div>
        <!-- Above the lane, not under it: under it, the thumbs flying the Viper covered the line. -->
        <div class="comms-slot">
          <CommsOverlay v-if="status.comms" docked :comms="status.comms" />
          <SpeechBanner v-if="speaking" docked />
        </div>
      </header>
      <div v-if="cic" class="lane-head">
        <span class="stencil">Dradis</span>
        <StatusRow v-if="showFleet" :training="status.training" :drill="status.drill" :challenge="challengeLabel" />
      </div>
      <div class="play">
        <div ref="canvasHost" class="canvas-host" aria-hidden="true" />
        <RecoveringOverlay v-if="status.choosingUpgrade" :wide="cic" :comms="status.comms" />
        <DragHint v-if="inCombat" />
        <TitleOverlay
          v-if="cic && status.phase === 'title' && !endScreen"
          in-lane
          @start="beginRun"
          @training="beginTraining"
          @challenge="beginChallenge"
        />
        <LessonCard
          v-if="status.lesson"
          :lesson="status.lesson"
          :focus-boxes="lessonBoxes"
          :canvas-host="canvasHost"
          @got-it="session.dismissLesson()"
          @skip="session.abandonRun()"
        />
      </div>
      <!-- Touch only: without the buttons the lane runs to the bottom edge. -->
      <footer v-if="inRun && !cic && isTouch" class="bottom-band">
        <!-- During the pick the buttons step aside, so they never sit under Apply. -->
        <SpecialButton v-if="showFleet && !status.choosingUpgrade" :disabled="!inCombat" />
        <MissileButton v-if="showFleet && !status.choosingUpgrade" :disabled="!inCombat" />
      </footer>
    </div>

    <CommsConsole v-if="cic" class="side" :standby="!showFleet" :comms="status.choosingUpgrade ? null : status.comms" :log="status.commsLog" :speaking="speaking">
      <template #controls>
        <HudBar
          v-if="inRun"
          :phase="status.phase"
          :allow-pause="!status.choosingUpgrade"
          @pause="session.pause('player')"
          @about="openAbout"
        />
      </template>
      <div class="standby-quote">
        <span class="standby-label">Overheard in CIC</span>
        <p class="standby-text" data-testid="title-quote">{{ quote }}</p>
        <p class="standby-note">{{ titleCopy.inspired }}</p>
      </div>
    </CommsConsole>
  </div>

  <RunSummary
    v-if="endScreen"
    :key="endScreen.result.headlineId + endScreen.result.score"
    :result="endScreen.result"
    :game-version="endScreen.gameVersion"
    :shared="endScreen.shared"
    :can-beat="endScreen.canBeat"
    :rival="endScreen.rival"
    @continue="leaveEndScreen"
    @beat="beatSharedRun"
  />

  <TrainingDebrief
    v-else-if="status.debrief"
    :debrief="status.debrief"
    @launch="launchAfterTraining"
    @title="session.returnToTitle()"
  />

  <TitleOverlay
    v-else-if="!cic && status.phase === 'title'"
    @start="beginRun"
    @training="beginTraining"
    @challenge="beginChallenge"
  />

  <JumpFade v-else-if="status.phase === 'running' && cyclePhase === 'jumping'" />

  <AboutSheet v-if="aboutOpen && status.phase === 'paused'" @resume="closeAbout" />

  <PauseOverlay
    v-else-if="(status.phase === 'paused' && status.pauseReason !== 'lesson') || status.phase === 'resuming'"
    :status="status"
    @resume="session.requestResume()"
    @abandon="session.abandonRun()"
  />

  <component :is="DevEndPreview" v-if="DevEndPreview && status.phase === 'title'" @preview="devPreview = $event" />
</template>

<style scoped>
.shell {
  position: absolute;
  inset: 0;
}

/* ---------- Narrow windows and phones: strips above and below the lane ---------- */

.shell:not(.cic).in-run .lane-column {
  height: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  /* Room for the top band (fleet, clock, status, comms) and the button strip. */
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
  /* One status chip: 14px text at 1.2 line height, 1px padding and border above and below. */
  min-height: calc(14px * 1.2 + 4px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottom-band {
  flex: none;
  box-sizing: border-box;
  z-index: 3;
  background: var(--color-space);
  padding: 6px 10px max(6px, env(safe-area-inset-bottom));
  /* Speech and Missile at the bottom corners, where the thumbs already are (PRD 13.2). */
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Holds its height while the buttons step aside for the pick, so the lane does not jump. */
  min-height: calc(68px + env(safe-area-inset-bottom));
}

.comms-slot {
  /* Fixed, so a longer line wraps inside the slot instead of resizing the playfield. */
  flex: none;
  height: 82px;
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

.shell.in-run .play,
.shell.cic .play {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.shell:not(.cic):not(.in-run) .play {
  position: absolute;
  inset: 0;
  width: auto;
}

.shell.in-run .canvas-host,
.shell.cic .canvas-host {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
}

.shell:not(.cic):not(.in-run) .canvas-host {
  position: absolute;
  inset: 0;
}

.canvas-host {
  pointer-events: none;
}

/* A phone is already a portrait. The column uses the screen width instead of a
   height-derived 9:16 that leaves the game as a thin strip. */
@media (max-width: 800px) {
  .shell:not(.cic).in-run .lane-column {
    width: 100%;
  }

}

/* ---------- Wide windows: the CIC shell, FLEET · DRADIS · COMMS (ADR-0002 Phase 2) ---------- */

.shell.cic {
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  gap: 28px;
  padding: 24px 32px;
  background: var(--color-deep);
}

.shell.cic .side {
  flex: 1 1 0;
  min-width: 240px;
  max-width: 400px;
}

/* The lane is 9:16-ish from the window height, minus the padding and the Dradis header. */
.shell.cic .lane-column {
  flex: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: calc((100dvh - 48px - 52px) * 324 / 480);
}

.shell.cic .play {
  /* No border of its own: the scene already draws the lane's frame. */
  overflow: hidden;
}

.lane-head {
  flex: none;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.stencil,
.standby-label {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 15px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

.standby-quote {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-space);
  border: 1px solid var(--color-dradis-line);
  border-radius: var(--radius);
}

.standby-text {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  font-style: italic;
  color: var(--color-text-warm);
}

.standby-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-muted);
}
</style>
