<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import type { LessonCard } from '../../application/training/LessonDirector';
import type { FocusBox } from '../../application/training/lessonFocus';
import { chooseCardSlot, spansFromWorld, type CardSlot } from '../lessonPlacement';
import { portraitSrc } from '../portraits';

/**
 * One Training Run lesson (PRD 5.5). During the fight it sits in the lane with the clock held, so
 * the HUD it points at stays in view. Over the pick sheet it covers the sheet until it is read.
 * Esc and P are handled at the window (main.ts), so this only needs its buttons.
 */
const props = defineProps<{
  lesson: LessonCard;
  /** What the lesson is about in the playfield, in world units (`lessonFocusBoxes`). */
  focusBoxes: readonly FocusBox[];
  /** The element holding the canvas, to turn world units into the lane's pixels. */
  canvasHost: HTMLElement | null;
}>();
const emit = defineEmits<{ gotIt: []; skip: [] }>();

/** A lesson about the playfield dims it less, so what it points at stays easy to see. */
const showsField = computed(() => props.lesson.pauses && props.focusBoxes.length > 0);

const gotItButton = useTemplateRef<HTMLButtonElement>('gotItButton');
const root = useTemplateRef<HTMLElement>('root');
const scrim = useTemplateRef<HTMLElement>('scrim');
/** Chosen once per lesson: the world is frozen while it is up, so the card never moves. */
const slot = ref<CardSlot>('bottom');

/**
 * Puts the card where it covers the least of what the lesson is about (PRD 5.5). Runs after the
 * card is in the page, since the choice needs its real height, and before the browser paints.
 */
function place(): void {
  const lane = scrim.value;
  const card = root.value;
  const canvas = props.canvasHost?.querySelector('canvas');
  if (!lane || !card || !props.lesson.pauses) return;
  const laneRect = lane.getBoundingClientRect();
  const spans = canvas ? spansFromWorld(props.focusBoxes, canvas.getBoundingClientRect(), laneRect) : [];
  const padding = Number.parseFloat(getComputedStyle(lane).paddingTop) || 0;
  slot.value = chooseCardSlot(laneRect.height, card.offsetHeight, padding, spans);
}

function show(): void {
  void nextTick(() => {
    place();
    gotItButton.value?.focus();
  });
}

onMounted(() => {
  show();
  window.addEventListener('resize', place);
});
onUnmounted(() => {
  window.removeEventListener('resize', place);
});
watch(() => props.lesson.id, show);

/** Tab stays inside the card. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const card = root.value;
  if (!card) return;
  const focusable = [...card.querySelectorAll<HTMLElement>('button:not([disabled])')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <div ref="scrim" class="scrim" :class="[{ 'over-sheet': !lesson.pauses, 'shows-field': showsField }, `slot-${slot}`]" data-ui>
    <section
      ref="root"
      class="card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-heading"
      data-testid="lesson"
      :data-lesson-id="lesson.id"
      :data-slot="lesson.pauses ? slot : undefined"
      @keydown="onKeydown"
    >
      <p class="kicker">
        <span>Sim</span>
        <span aria-hidden="true">·</span>
        <span>{{ lesson.pauses ? 'Clock held' : 'Between jumps' }}</span>
      </p>
      <h2 id="lesson-heading" class="heading">{{ lesson.heading }}</h2>
      <ol class="beats">
        <li v-for="(beat, index) in lesson.beats" :key="index" class="beat">
          <img
            v-if="portraitSrc(beat.speakerName, 'closed')"
            class="portrait"
            :src="portraitSrc(beat.speakerName, 'closed') ?? ''"
            alt=""
            width="48"
            height="48"
          />
          <span v-else class="portrait letter" aria-hidden="true">{{ beat.speakerName.slice(0, 1) }}</span>
          <span class="body">
            <span class="name">{{ beat.speakerName }}</span>
            <span class="text">{{ beat.text }}</span>
          </span>
        </li>
      </ol>
      <div class="actions">
        <button ref="gotItButton" class="got-it" type="button" @click="emit('gotIt')">Got it</button>
        <button v-if="lesson.pauses" class="skip" type="button" @click="emit('skip')">Leave training</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: auto;
  display: flex;
  align-items: safe flex-end;
  justify-content: center;
  overflow: auto;
  padding: var(--space-3);
  background: rgb(var(--rgb-deep) / 55%);
}

.scrim.slot-top {
  align-items: safe flex-start;
}

.scrim.slot-middle {
  align-items: safe center;
}

.scrim.shows-field {
  background: rgb(var(--rgb-deep) / 20%);
}

/* The pick sheet is a full-screen board on a wide window, so the lesson over it is too. */
.scrim.over-sheet {
  position: fixed;
  z-index: 6;
  align-items: safe center;
  background: rgb(var(--rgb-deep) / 80%);
}

.card {
  width: min(100%, 420px);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 14px 16px 16px;
  background: rgb(var(--rgb-panel) / 97%);
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

.heading {
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 22px;
  letter-spacing: 0.04em;
  color: var(--color-dradis-pale);
}

.beats {
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

.letter {
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 22px;
  color: var(--color-dradis-pale);
  border: 1px solid var(--color-dradis-line);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.name {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 14px;
  color: var(--color-brass);
}

.text {
  font-size: 16px;
  line-height: 1.4;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.got-it,
.skip {
  min-height: 44px;
  padding: 8px 16px;
  font: inherit;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  cursor: pointer;
  border-radius: 6px;
}

.got-it {
  min-width: 140px;
  font-size: 18px;
  color: var(--color-dradis-night);
  background: var(--color-dradis-soft);
  border: 0;
}

.skip {
  font-size: 14px;
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-dradis-line);
}

.got-it:focus-visible,
.skip:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
</style>
