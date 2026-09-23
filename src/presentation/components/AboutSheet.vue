<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from 'vue';
import titleCopy from '../../content/title.json';

const emit = defineEmits<{ resume: [] }>();

const resumeButton = useTemplateRef<HTMLButtonElement>('resumeButton');
const root = useTemplateRef<HTMLElement>('root');
const pitch = titleCopy.body[0] ?? '';

onMounted(() => {
  void nextTick(() => {
    resumeButton.value?.focus();
  });
});

/** Esc resumes. Tab stays inside the sheet. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    emit('resume');
    return;
  }
  if (event.key !== 'Tab') return;
  const sheet = root.value;
  if (!sheet) return;
  const focusable = [...sheet.querySelectorAll<HTMLElement>('button:not([disabled])')];
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
  <div
    ref="root"
    data-ui
    class="layer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="about-title"
    @keydown="onKeydown"
  >
    <div class="sheet">
      <h2 id="about-title" class="title">About</h2>
      <p class="paused">Paused, so you can read this.</p>
      <p v-if="pitch" class="pitch">{{ pitch }}</p>
      <p class="inspired">{{ titleCopy.inspired }}</p>
      <p class="goal">{{ titleCopy.manual.goal }}</p>
      <h3 class="heading">{{ titleCopy.manual.controlsHeading }}</h3>
      <dl class="controls">
        <div v-for="row in titleCopy.manual.controls" :key="row.action" class="control">
          <dt>{{ row.action }}</dt>
          <dd>{{ row.detail }}</dd>
        </div>
      </dl>
      <div v-for="block in titleCopy.manual.fight" :key="block.heading" class="block">
        <h3 class="heading">{{ block.heading }}</h3>
        <p>{{ block.text }}</p>
      </div>
      <p class="disclaimer">{{ titleCopy.disclaimer }}</p>
      <button ref="resumeButton" class="resume" type="button" @click="emit('resume')">Resume</button>
    </div>
  </div>
</template>

<style scoped>
.layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: auto;
  overflow: auto;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: rgb(5 7 10 / 88%);
  color: #e8d8cf;
  font-family: ui-sans-serif, system-ui, sans-serif;
}

.sheet {
  width: min(36rem, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.title {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 28px;
  letter-spacing: 0.04em;
  color: #b8ffdc;
}

.paused,
.inspired,
.disclaimer {
  margin: 0;
  color: #9fb8ab;
  font-size: 14px;
}

.pitch,
.goal,
.block p {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
}

.heading {
  margin: 8px 0 0;
  font-family: ui-monospace, monospace;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: #7fd6a0;
}

.controls {
  margin: 0;
}

.control {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: 8px;
  margin: 0 0 6px;
}

.control dt {
  margin: 0;
  font-family: ui-monospace, monospace;
  color: #b8ffdc;
}

.control dd {
  margin: 0;
}

.resume {
  align-self: center;
  min-width: 160px;
  min-height: 48px;
  margin-top: 8px;
  font: inherit;
  font-family: ui-monospace, monospace;
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
