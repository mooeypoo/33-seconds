<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import type { RivalComparison } from '../../application/challenges';
import type { RunResult } from '../../application/runResult';
import { summarizeRun } from '../share/runSummary';
import { shareImage, shareLink, shareUrl, type ShareOutcome } from '../share/shareActions';

/**
 * The end of a run, won or lost, and the page a share link opens (PRD 5.4, 17). One screen for
 * both outcomes: the kicker and the headline say which, so colour is never the only cue. No timer.
 * `shared` is someone else's run: it offers a game instead of sharing it on, and for a challenge
 * this version can play, Beat this (PRD 11.1). `rival` is the run you were trying to beat.
 */
const props = defineProps<{
  result: RunResult;
  gameVersion: string;
  shared?: boolean;
  canBeat?: boolean;
  rival?: RivalComparison | null;
}>();
const emit = defineEmits<{ continue: []; beat: [] }>();

/** Words first, so the colour of the run is never the only way to tell who won (PRD 15). */
const RIVAL_WORDS: Record<RivalComparison['outcome'], string> = {
  beat: 'You beat it.',
  tied: 'Dead even.',
  short: 'Not this time.',
};

function points(value: number): string {
  return value.toLocaleString('en-US');
}

const summary = computed(() => summarizeRun(props.result));
const won = computed(() => props.result.outcome === 'won');
const continueLabel = computed(() => (props.shared ? 'Play 33 Seconds' : won.value ? 'Continue' : 'Retry'));

const primary = useTemplateRef<HTMLButtonElement>('primary');
const busy = ref(false);
const notice = ref('');
/** Shown when the clipboard refused, so the link can still be copied by hand. */
const manualLink = ref<string | null>(null);

const LINK_NOTICES: Record<ShareOutcome, string> = {
  shared: 'Shared.',
  copied: 'Link copied.',
  saved: '',
  cancelled: '',
  failed: 'Copy did not work here. Select the link below instead.',
};

const IMAGE_NOTICES: Record<ShareOutcome, string> = {
  shared: 'Shared.',
  copied: 'Image copied.',
  saved: 'Image saved to your downloads.',
  cancelled: '',
  failed: 'Could not make the image here.',
};

async function onShareLink(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  const outcome = await shareLink(props.result, props.gameVersion);
  busy.value = false;
  notice.value = LINK_NOTICES[outcome];
  manualLink.value = outcome === 'failed' ? shareUrl(props.result, props.gameVersion) : null;
}

async function onShareImage(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  notice.value = 'Drawing…';
  const outcome = await shareImage(props.result, props.gameVersion);
  busy.value = false;
  notice.value = IMAGE_NOTICES[outcome];
}

onMounted(() => {
  primary.value?.focus();
});
</script>

<template>
  <div class="end" :class="{ won, lost: !won }">
    <section
      class="panel"
      data-ui
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-summary-headline"
      :data-testid="shared ? 'shared-result' : `result-${result.outcome}`"
    >
      <p class="kicker">
        <span>{{ summary.kicker }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ summary.tier }}</span>
        <span v-if="shared" class="version">· v{{ gameVersion }}</span>
      </p>
      <h2 id="run-summary-headline">{{ summary.headline }}</h2>
      <p class="line">{{ summary.text }}</p>
      <p v-if="summary.verdict" class="verdict" data-testid="verdict">{{ summary.verdict }}</p>
      <ul v-if="summary.challengeDetails.length > 0" class="details">
        <li v-for="detail in summary.challengeDetails" :key="detail">{{ detail }}</li>
      </ul>

      <p v-if="rival" class="rival" data-testid="rival">
        <span class="rival-verdict">{{ RIVAL_WORDS[rival.outcome] }}</span>
        <span>You {{ points(rival.yours) }} · Them {{ points(rival.theirs) }}</span>
      </p>

      <p class="score">
        <span class="score-label">Score</span>
        <span class="score-value" data-testid="result-score">{{ summary.score }}</span>
      </p>

      <dl class="stats">
        <div v-for="stat in summary.stats" :key="stat.label" class="stat">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>

      <p v-if="summary.mostKilled" class="joke">{{ summary.mostKilled }}</p>

      <div v-if="summary.cards.length > 0" class="cards">
        <span class="cards-label">Cards</span>
        <ul>
          <li v-for="card in summary.cards" :key="card">{{ card }}</li>
        </ul>
      </div>

      <div class="actions">
        <template v-if="shared && canBeat">
          <button ref="primary" data-ui type="button" class="primary" data-testid="beat-this" @click="emit('beat')">
            Beat this
          </button>
          <button data-ui type="button" data-testid="play-from-share" @click="emit('continue')">Title</button>
        </template>
        <button
          v-else
          ref="primary"
          data-ui
          type="button"
          class="primary"
          :data-testid="shared ? 'play-from-share' : `continue-${won ? 'win' : 'lose'}`"
          @click="emit('continue')"
        >
          {{ continueLabel }}
        </button>
        <button v-if="!shared" data-ui type="button" :disabled="busy" @click="onShareLink">Share link</button>
        <button data-ui type="button" :disabled="busy" @click="onShareImage">Copy image</button>
      </div>

      <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
      <p v-if="manualLink" class="manual-link" data-testid="share-link">{{ manualLink }}</p>
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
  padding: var(--space-4, 16px);
  box-sizing: border-box;
  overflow-y: auto;
  background: rgb(var(--rgb-ink) / 80%);
  --accent: var(--color-dradis);
  --accent-soft: var(--color-dradis-soft);
  --edge: var(--color-dradis-line);
  --warm: var(--color-text);
}

.end.lost {
  --accent: var(--color-loss);
  --accent-soft: var(--color-loss);
  --edge: var(--color-loss-border);
  --warm: var(--color-text-warm);
}

.panel {
  width: min(100%, 380px);
  padding: 20px 22px;
  box-sizing: border-box;
  background: rgb(var(--rgb-panel) / 96%);
  border: 1px solid var(--edge);
  color: var(--warm);
  font-family: var(--font-body);
}

.kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 16px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-soft);
}

.version {
  color: var(--color-text-muted);
}

h2 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 30px;
  line-height: 1.05;
  font-weight: normal;
  color: var(--color-text-strong);
}

.line {
  margin: 0 0 14px;
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.verdict {
  margin: -6px 0 14px;
  padding-left: 10px;
  border-left: 3px solid var(--accent);
  font-size: 16px;
  line-height: 1.4;
  color: var(--color-text-strong);
}

.details {
  margin: -6px 0 12px;
  padding-left: 1.1em;
  font-size: 14px;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.rival {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  margin: 0 0 12px;
  padding: 6px 10px;
  border: 1px solid var(--edge);
  font-size: 15px;
  color: var(--color-text-strong);
  font-variant-numeric: tabular-nums;
}

.rival-verdict {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  letter-spacing: 0.06em;
  color: var(--accent-soft);
}

.score {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 0 10px;
  padding: 6px 0;
  border-top: 1px solid var(--edge);
  border-bottom: 1px solid var(--edge);
}

.score-label {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-soft);
}

.score-value {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 48px;
  line-height: 1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.stats {
  margin: 0 0 10px;
}

.stat {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
  font-size: 15px;
}

dt {
  color: var(--color-text-muted);
}

dd {
  margin: 0;
  color: var(--color-text-strong);
  font-variant-numeric: tabular-nums;
}

.joke {
  margin: 0 0 10px;
  font-size: 14px;
  font-style: italic;
  line-height: 1.4;
  color: var(--color-text-muted);
}

.cards {
  margin: 0 0 14px;
  font-size: 14px;
}

.cards-label {
  display: block;
  margin-bottom: 2px;
  color: var(--color-text-muted);
}

.cards ul {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cards li {
  padding: 1px 6px;
  border: 1px solid var(--edge);
  color: var(--color-text-strong);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  flex: 1 1 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  font: inherit;
  font-size: 16px;
  color: var(--color-text-strong);
  background: transparent;
  border: 1px solid var(--edge);
  cursor: pointer;
}

button.primary {
  flex-basis: 100%;
  color: var(--color-space);
  background: var(--accent);
  border-color: var(--accent);
}

button:disabled {
  opacity: 0.6;
  cursor: progress;
}

button:focus-visible {
  outline: 2px solid var(--color-text-strong);
  outline-offset: 3px;
}

.notice {
  min-height: 1.4em;
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

.manual-link {
  margin: 4px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
  user-select: all;
  color: var(--color-text-strong);
}
</style>
