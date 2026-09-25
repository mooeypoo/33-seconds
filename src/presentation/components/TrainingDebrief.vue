<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import type { TrainingDebrief } from '../../application/GameSession';
import { portraitSrc } from '../portraits';

/**
 * The end of a Training Run (PRD 5.5). No score and no share: Tyrol's word, his grade, and a line
 * for anything the sim never got to show. Launch goes straight to a real run. No timer.
 */
defineProps<{ debrief: TrainingDebrief }>();
const emit = defineEmits<{ launch: []; title: [] }>();

const primary = useTemplateRef<HTMLButtonElement>('primary');

onMounted(() => {
  primary.value?.focus();
});
</script>

<template>
  <div class="end">
    <section class="panel" data-ui role="dialog" aria-modal="true" aria-labelledby="debrief-heading" data-testid="training-debrief">
      <p class="kicker">
        <span>Training</span>
        <span aria-hidden="true">·</span>
        <span>{{ debrief.outcome === 'won' ? 'Sim cleared' : 'Sim over' }}</span>
      </p>
      <h2 id="debrief-heading">{{ debrief.heading }}</h2>

      <ol class="beats">
        <li v-for="(beat, index) in debrief.beats" :key="index" class="beat">
          <img
            v-if="portraitSrc(beat.speakerName, 'closed')"
            class="portrait"
            :src="portraitSrc(beat.speakerName, 'closed') ?? ''"
            alt=""
            width="48"
            height="48"
          />
          <span class="body">
            <span class="name">{{ beat.speakerName }}</span>
            <span class="text">{{ beat.text }}</span>
          </span>
        </li>
      </ol>

      <p v-if="debrief.grade" class="grade">
        <span class="grade-label">Tyrol's grade</span>
        <span class="grade-value" data-testid="training-grade">{{ debrief.grade }}</span>
      </p>

      <div v-if="debrief.recaps.length > 0" class="recaps">
        <p class="recap-intro">{{ debrief.recapIntro }}</p>
        <ul>
          <li v-for="recap in debrief.recaps" :key="recap">{{ recap }}</li>
        </ul>
      </div>

      <div class="actions">
        <button ref="primary" type="button" class="primary" @click="emit('launch')">Launch — Viper Pilot</button>
        <button type="button" @click="emit('title')">Back to title</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.end {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  box-sizing: border-box;
  overflow-y: auto;
  background: rgb(var(--rgb-ink) / 80%);
}

.panel {
  width: min(100%, 420px);
  padding: 20px 22px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: rgb(var(--rgb-panel) / 96%);
  border: 1px solid var(--color-dradis-line);
  border-left: 4px solid var(--color-brass);
  color: var(--color-text-warm);
  font-family: var(--font-body);
}

.kicker {
  margin: 0;
  display: flex;
  gap: 6px;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-amber);
}

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 28px;
  letter-spacing: 0.04em;
  color: var(--color-dradis-pale);
}

.beats,
.recaps ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.beat {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.portrait {
  flex: none;
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name,
.grade-label,
.recap-intro {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 14px;
  color: var(--color-brass);
}

.text,
.recaps li {
  font-size: 16px;
  line-height: 1.4;
}

.grade {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 2px solid var(--color-dradis-deep);
}

.grade-value {
  font-size: 18px;
  font-style: italic;
  color: var(--color-text-strong);
}

.recap-intro {
  margin: 0 0 var(--space-1);
}

.recaps li {
  padding-left: 10px;
  border-left: 2px solid var(--color-dradis-line);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.actions button {
  min-height: 44px;
  padding: 8px 14px;
  font: inherit;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  color: var(--color-dradis-pale);
  background: transparent;
  border: 1px solid var(--color-dradis-deep);
  cursor: pointer;
}

.actions .primary {
  font-size: 18px;
  color: var(--color-dradis-night);
  background: var(--color-dradis);
  border: 0;
}

.actions button:focus-visible {
  outline: 2px solid var(--color-dradis-pale);
  outline-offset: 3px;
}
</style>
