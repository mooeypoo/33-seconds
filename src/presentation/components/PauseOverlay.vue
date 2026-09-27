<script setup lang="ts">
import { computed } from 'vue';
import type { PauseReason, SessionStatus } from '../../application/GameSession';
import { settingsStore } from '../stores/settingsStore';
import MuteControl from './MuteControl.vue';
import VolumeControl from './VolumeControl.vue';

const props = defineProps<{ status: SessionStatus }>();
const emit = defineEmits<{ resume: []; abandon: [] }>();

/** Why we paused, in plain words: a pause nobody asked for should explain itself. */
const REASON_TEXT: Record<PauseReason, string> = {
  player: 'Paused.',
  'tab-hidden': 'Paused because the tab went to the background.',
  'window-blurred': 'Paused because the window lost focus.',
  'pointer-cancelled': 'Paused because your touch was interrupted.',
  'orientation-changed': 'Paused because the screen rotated.',
  lesson: 'Paused for a lesson.',
};

const reasonText = computed(() => (props.status.pauseReason ? REASON_TEXT[props.status.pauseReason] : 'Paused.'));
const isCountingDown = computed(() => props.status.phase === 'resuming');
/** The comms log, newest first (PRD 12.2). Frozen with everything else while paused. */
const log = computed(() => [...props.status.commsLog].reverse());
</script>

<template>
  <div data-ui class="overlay">
    <template v-if="isCountingDown">
      <!-- Announced politely, and the number is large enough to read at a glance. -->
      <p class="countdown" data-testid="countdown" role="status" aria-live="polite">{{ status.countdownSeconds }}</p>
      <p class="note">Resuming. Let go of everything.</p>
    </template>

    <template v-else>
      <h2 class="heading">{{ reasonText }}</h2>
      <p class="note">Nothing is running: the clock, the swarm, and every effect are frozen.</p>
      <button class="resume" type="button" @click="emit('resume')">Resume</button>
      <button data-ui class="abandon" type="button" @click="emit('abandon')">Abandon run</button>
      <MuteControl />
      <VolumeControl />
      <button
        data-ui
        class="effects"
        type="button"
        :aria-pressed="settingsStore.state.snapshot.reducedEffects"
        @click="settingsStore.toggleReducedEffects()"
      >
        {{ settingsStore.state.snapshot.reducedEffects ? 'Reduced effects on' : 'Reduced effects off' }}
      </button>
      <button
        data-ui
        class="effects"
        type="button"
        :aria-pressed="settingsStore.state.snapshot.readableFont"
        @click="settingsStore.toggleReadableFont()"
      >
        {{ settingsStore.state.snapshot.readableFont ? 'Readable font on' : 'Readable font off' }}
      </button>
      <button
        data-ui
        class="effects"
        type="button"
        :aria-pressed="settingsStore.state.snapshot.characterVoices"
        @click="settingsStore.toggleCharacterVoices()"
      >
        {{ settingsStore.state.snapshot.characterVoices ? 'Character voices on' : 'Character voices off' }}
      </button>
      <p class="note small">Abandon run goes back to the title and discards this run.</p>
      <section class="log" aria-label="Comms log" data-testid="comms-log">
        <h3 class="log-heading">Comms log</h3>
        <p v-if="log.length === 0" class="note small">Nothing said yet.</p>
        <ol v-else class="log-lines">
          <li v-for="(line, index) in log" :key="index"><strong>{{ line.speakerName }}.</strong> {{ line.text }}</li>
        </ol>
      </section>
    </template>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  /* safe: with the comms log, a short screen scrolls instead of clipping the top. */
  justify-content: safe center;
  overflow: auto;
  padding: 24px;
  text-align: center;
  background: rgb(var(--rgb-deep) / 82%);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
}

.heading {
  margin: 0;
  font-size: 20px;
}

.countdown {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  margin: 0;
  font-size: clamp(48px, 18vw, 120px);
  line-height: 1;
}

.note {
  max-width: 34ch;
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

.small {
  font-size: 12px;
}

.resume {
  min-width: 160px;
  min-height: 48px;
  font: inherit;
  font-size: 18px;
  color: var(--color-dradis-night);
  background: var(--color-dradis-soft);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.resume:focus-visible,
.abandon:focus-visible,
.effects:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}

.abandon {
  min-width: 160px;
  min-height: 44px;
  font: inherit;
  font-size: 15px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-danger-border);
  border-radius: 8px;
  cursor: pointer;
}

.effects {
  min-width: 160px;
  min-height: 44px;
  font: inherit;
  font-size: 15px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-dradis-line);
  border-radius: 8px;
  cursor: pointer;
}
.log {
  width: min(440px, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
}

.log-heading {
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-weight: 400;
  font-size: 15px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

/* Up to twenty lines: it scrolls rather than pushing the buttons off a short screen. */
.log-lines {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  max-height: 28vh;
  overflow: auto;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: 14px;
  line-height: 1.35;
  color: var(--color-text-warm);
  background: rgb(var(--rgb-panel) / 80%);
  border: 1px solid var(--color-dradis-line);
  border-radius: var(--radius);
}
</style>
