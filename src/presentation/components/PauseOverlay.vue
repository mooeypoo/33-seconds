<script setup lang="ts">
import { computed } from 'vue';
import type { PauseReason, SessionStatus } from '../../application/GameSession';

const props = defineProps<{ status: SessionStatus }>();
const emit = defineEmits<{ resume: [] }>();

/** Why we paused, in plain words: a pause nobody asked for should explain itself. */
const REASON_TEXT: Record<PauseReason, string> = {
  player: 'Paused.',
  'tab-hidden': 'Paused because the tab went to the background.',
  'window-blurred': 'Paused because the window lost focus.',
  'pointer-cancelled': 'Paused because your touch was interrupted.',
  'orientation-changed': 'Paused because the screen rotated.',
};

const reasonText = computed(() => (props.status.pauseReason ? REASON_TEXT[props.status.pauseReason] : 'Paused.'));
const isCountingDown = computed(() => props.status.phase === 'resuming');
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
      <p class="note small">Settings, mute, abandon run, the comms log, and the complaints board arrive later.</p>
    </template>
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
  background: rgb(5 7 10 / 82%);
  color: #cfe8d8;
  font-family: ui-monospace, monospace;
}

.heading {
  margin: 0;
  font-size: 20px;
}

.countdown {
  margin: 0;
  font-size: clamp(48px, 18vw, 120px);
  line-height: 1;
}

.note {
  max-width: 34ch;
  margin: 0;
  font-size: 14px;
  color: #9fb8ab;
}

.small {
  font-size: 12px;
}

.resume {
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

.resume:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
