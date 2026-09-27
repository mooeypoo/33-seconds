<script setup lang="ts">
import { computed, nextTick, useTemplateRef, ref } from 'vue';
import titleCopy from '../../content/title.json';
import viperNeutral from '../../../assets/ships/viper_neutral.png';
import type { TierId } from '../../domain/balance/profile';
import { titleQuote } from '../titleQuote';
import MuteControl from './MuteControl.vue';
import { settingsStore } from '../stores/settingsStore';
/**
 * In the CIC shell the face sits in the lane only, between the standby consoles, which carry the
 * quote and the disclaimer (ADR-0002 Phase 2). Otherwise it is the whole screen, as on a phone.
 */
defineProps<{ inLane?: boolean }>();
const emit = defineEmits<{ start: [tier: TierId]; training: [] }>();

/** New players see the Training Run first; after one, it stays on offer but steps aside (PRD 5.5). */
const trainingDone = computed(() => settingsStore.state.snapshot.trainingCompleted);

type Sheet = 'manual' | 'credits';
type ManualTab = 'controls' | 'fight';

const quote = titleQuote();
const lead = titleCopy.body[1] ?? '';

const sheet = ref<Sheet | null>(null);
const manualTab = ref<ManualTab>('controls');
const backButton = useTemplateRef<HTMLButtonElement>('backButton');
const manualButton = useTemplateRef<HTMLButtonElement>('manualButton');
const creditsButton = useTemplateRef<HTMLButtonElement>('creditsButton');
const sheetRoot = useTemplateRef<HTMLElement>('sheetRoot');

function openSheet(which: Sheet): void {
  if (which === 'manual') manualTab.value = 'controls';
  sheet.value = which;
  void nextTick(() => {
    backButton.value?.focus();
  });
}

function closeSheet(): void {
  const which = sheet.value;
  sheet.value = null;
  void nextTick(() => {
    (which === 'credits' ? creditsButton.value : manualButton.value)?.focus();
  });
}

/** Keep Tab inside the sheet. Esc returns to the face. Pause is a no-op while the title is up. */
function onSheetKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeSheet();
    return;
  }
  if (event.key !== 'Tab') return;
  const root = sheetRoot.value;
  if (!root) return;
  const focusable = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
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
  <!-- data-ui: the whole face is a control, including the clear well over the playfield, so a touch here is not the drag stick. -->
  <div data-ui class="stage" :class="{ 'in-lane': inLane }">
    <div class="board" :inert="sheet !== null">
      <span class="bracket bracket-nw" aria-hidden="true"></span>
      <span class="bracket bracket-ne" aria-hidden="true"></span>
      <span class="bracket bracket-sw" aria-hidden="true"></span>
      <span class="bracket bracket-se" aria-hidden="true"></span>

      <section class="mast" aria-label="33 Seconds">
        <div class="mast-inner">
          <div class="wordmark">
            <img class="mark" :src="viperNeutral" alt="" width="128" height="128" />
            <h1 class="title">{{ titleCopy.title }}</h1>
          </div>
          <p class="pitch">{{ titleCopy.body[0] }}</p>
          <template v-if="!inLane">
            <p class="inspired">{{ titleCopy.inspired }}</p>
            <p v-if="quote" class="quote" data-testid="title-quote">{{ quote }}</p>
          </template>
        </div>
      </section>

      <!-- The playfield is empty until a run starts, so Launch sits on it, first and largest. -->
      <div class="well">
        <div class="launch-box">
          <button class="launch" type="button" @click="emit('start', 'viper-pilot')">Launch — Viper Pilot</button>
          <p class="tier-note">{{ titleCopy.tiers.viperPilot }}</p>
        </div>
        <div v-if="!trainingDone" class="training-box fresh" data-testid="training-box">
          <p class="kicker">{{ titleCopy.training.kicker }}</p>
          <button class="training" type="button" @click="emit('training')">{{ titleCopy.training.button }}</button>
          <p class="tier-note">{{ titleCopy.training.note }}</p>
        </div>
      </div>

      <section class="actions" aria-label="More">
        <div class="actions-inner">
          <!--
            Civilian Run has no button for now (PRD 13): the tier and its copy stay, and it comes back
            with the named difficulty levels.
          -->

          <div v-if="trainingDone" class="training-box" data-testid="training-box">
            <button class="training quiet" type="button" @click="emit('training')">{{ titleCopy.training.button }}</button>
            <p class="tier-note">{{ titleCopy.training.noteDone }}</p>
          </div>

          <!-- The choice comes before any sound can play (PRD 14.1). -->
          <div class="sound-row">
            <p class="sound">{{ titleCopy.sound }}</p>
            <MuteControl />
          </div>

          <p class="hint">{{ titleCopy.controls }}</p>

          <div class="more">
            <button ref="manualButton" class="more-button" type="button" @click="openSheet('manual')">How to fly</button>
            <button ref="creditsButton" class="more-button" type="button" @click="openSheet('credits')">
              Credits
            </button>
          </div>

          <p v-if="!inLane" class="disclaimer">{{ titleCopy.disclaimer }}</p>
        </div>
      </section>
    </div>

    <div
      v-if="sheet"
      ref="sheetRoot"
      class="sheet-layer"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="sheet === 'credits' ? 'credits-title' : 'manual-title'"
      @keydown="onSheetKeydown"
      @pointerdown.self="closeSheet"
    >
      <div class="sheet" @pointerdown.stop>
        <button ref="backButton" class="back" type="button" @click="closeSheet">Back</button>

        <template v-if="sheet === 'manual'">
          <h2 id="manual-title" class="sheet-title">{{ titleCopy.manual.title }}</h2>
          <p v-if="lead" class="lead">{{ lead }}</p>
          <div class="tabs" role="tablist" aria-label="How to fly">
            <button
              class="tab"
              type="button"
              role="tab"
              :aria-selected="manualTab === 'controls'"
              @click="manualTab = 'controls'"
            >
              {{ titleCopy.manual.controlsHeading }}
            </button>
            <button
              class="tab"
              type="button"
              role="tab"
              :aria-selected="manualTab === 'fight'"
              @click="manualTab = 'fight'"
            >
              {{ titleCopy.manual.fightTab }}
            </button>
          </div>
          <div v-if="manualTab === 'controls'" class="panel" role="tabpanel">
            <dl class="controls">
              <div v-for="row in titleCopy.manual.controls" :key="row.action" class="control">
                <dt>{{ row.action }}</dt>
                <dd>{{ row.detail }}</dd>
              </div>
            </dl>
          </div>
          <div v-else class="panel" role="tabpanel">
            <p class="goal">{{ titleCopy.manual.goal }}</p>
            <div v-for="block in titleCopy.manual.fight" :key="block.heading" class="block">
              <h3 class="block-heading">{{ block.heading }}</h3>
              <p>{{ block.text }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <h2 id="credits-title" class="sheet-title">{{ titleCopy.credits.title }}</h2>
          <p class="byline">{{ titleCopy.credits.byline }}</p>
          <p class="inspiration">{{ titleCopy.credits.inspiration }}</p>
          <p class="inspiration">{{ titleCopy.credits.thanks }}</p>
          <ul class="credit-links">
            <li v-for="link in titleCopy.credits.links" :key="link.href">
              <a class="credit-link" :href="link.href" target="_blank" rel="noopener noreferrer">
                {{ link.label }}
                <span class="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
          <p class="disclaimer">{{ titleCopy.disclaimer }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  display: flex;
  align-items: safe center;
  justify-content: center;
  overflow: auto;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: rgb(var(--rgb-deep) / 24%);
  color: var(--color-text-strong);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
}

.board {
  position: relative;
  width: min(520px, 100%);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0;
  background: transparent;
}

.bracket {
  display: none;
}

.bracket-nw {
  top: 5px;
  left: 5px;
  border-right: 0;
  border-bottom: 0;
}

.bracket-ne {
  top: 5px;
  right: 5px;
  border-left: 0;
  border-bottom: 0;
}

.bracket-sw {
  bottom: 5px;
  left: 5px;
  border-right: 0;
  border-top: 0;
}

.bracket-se {
  right: 5px;
  bottom: 5px;
  border-left: 0;
  border-top: 0;
}

.mast,
.actions {
  background: rgb(var(--rgb-space) / 94%);
  border: 2px solid var(--color-dradis-deep);
}

.mast-inner,
.actions-inner {
  padding: 22px 18px;
}

.well {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 132px;
}

.well .launch-box,
.well .training-box {
  width: min(320px, 100%);
  box-sizing: border-box;
  background: rgb(var(--rgb-space) / 92%);
}

.training-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--color-gunmetal);
}

/*
 * First visit: the sim is suggested, so it keeps the amber frame and kicker, but under Launch and
 * outlined, so Launch is still the first and largest thing on the face.
 */
.training-box.fresh {
  border: 1px solid var(--color-amber);
}

.training {
  font: inherit;
  cursor: pointer;
  min-height: 44px;
  padding: 10px 14px;
  text-align: left;
  font-size: 16px;
  color: var(--color-amber);
  background: transparent;
  border: 1px solid var(--color-amber);
}

.training.quiet {
  font-size: 16px;
  color: var(--color-dradis-pale);
  background: transparent;
  border: 1px solid var(--color-dradis-deep);
}

.training:focus-visible {
  outline: 2px solid var(--color-dradis-pale);
  outline-offset: 3px;
}

.wordmark {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.mark {
  width: 64px;
  height: 64px;
  flex: none;
  image-rendering: pixelated;
}

.title {
  margin: 0;
  font-size: clamp(28px, 7vw, 48px);
  line-height: 0.95;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: var(--color-dradis-pale);
}

.pitch,
.quote,
.inspired,
.lead,
.sound,
.hint,
.tier-note,
.disclaimer,
.byline,
.inspiration,
.block p,
.controls dd {
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
}

.pitch {
  margin-top: 14px;
  color: var(--color-text-strong);
}

.inspired {
  margin-top: 10px;
  color: var(--color-text-gunmetal);
  font-size: 14px;
}

.quote {
  margin-top: 12px;
  padding-left: 10px;
  border-left: 3px solid var(--color-amber);
  color: var(--color-text-gunmetal);
  font-style: italic;
}

.actions-inner {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.launch-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 2px solid var(--color-dradis);
  background: rgb(var(--rgb-dradis-night) / 55%);
}

.kicker {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-amber);
}

.launch,
.more-button,
.back,
.tab,
.credit-link {
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}

.launch,
.more-button,
.back,
.tab {
  padding: 10px 14px;
  text-align: left;
}

.launch {
  min-height: 60px;
  font-size: 24px;
  color: var(--color-dradis-night);
  background: var(--color-dradis);
  border: 0;
}

.more-button,
.back,
.tab {
  color: var(--color-dradis-pale);
  background: transparent;
  border: 1px solid var(--color-dradis-deep);
}

.tab[aria-selected='true'] {
  color: var(--color-dradis-night);
  background: var(--color-dradis);
  border-color: var(--color-dradis);
}

.tier-note,
.hint,
.disclaimer {
  color: var(--color-text-gunmetal);
}

.tier-note {
  font-size: 14px;
}

.sound-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sound {
  flex: 1;
  color: var(--color-text-strong);
}

.more {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.disclaimer {
  font-size: 13px;
}

.launch:focus-visible,
.more-button:focus-visible,
.back:focus-visible,
.tab:focus-visible,
.credit-link:focus-visible {
  outline: 2px solid var(--color-dradis-pale);
  outline-offset: 3px;
}

.sheet-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  background: rgb(var(--rgb-deep) / 96%);
}

.sheet {
  width: min(640px, 100%);
  margin-block: auto;
  padding: 18px 18px 22px;
  background: var(--color-space);
  border: 2px solid var(--color-dradis-deep);
  box-shadow:
    0 0 0 4px var(--color-space),
    0 0 0 6px var(--color-dradis);
}

.back {
  min-width: 88px;
}

.sheet-title {
  margin: 14px 0 0;
  font-size: clamp(26px, 5vw, 36px);
  letter-spacing: 0.05em;
  color: var(--color-dradis-pale);
}

.lead,
.byline,
.inspiration {
  margin-top: 10px;
  color: var(--color-text-strong);
}

.inspiration {
  color: var(--color-text-gunmetal);
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 18px;
}

.tab {
  font-size: 15px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
}

.panel {
  margin-top: 8px;
}

.goal {
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 1.4;
  color: var(--color-text-strong);
}

.controls {
  margin: 0;
}

.control,
.block {
  padding-top: 16px;
  margin-top: 16px;
  border-top: 1px solid var(--color-dradis-deep);
}

.controls dt,
.block-heading {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0.04em;
  color: var(--color-dradis-pale);
}

.controls dd,
.block p {
  margin: 6px 0 0;
  max-width: 36em;
  color: var(--color-text-strong);
}

.credit-links {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credit-link {
  display: inline-flex;
  align-items: center;
  color: var(--color-dradis-pale);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* The playfield is a portrait column. On a wide window the face flanks it instead of covering it. */
@media (min-width: 960px) {
  .stage {
    align-items: stretch;
    padding: 0;
    overflow: hidden;
    background: rgb(var(--rgb-deep) / 24%);
  }

  .board {
    width: auto;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) min(calc(100dvh * 270 / 480), 46vw) minmax(280px, 1fr);
    gap: 0;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .bracket {
    display: none;
  }

  .well {
    display: flex;
  }

  .mast,
  .actions {
    min-width: 0;
    min-height: 0;
    overflow: auto;
    background: rgb(var(--rgb-space) / 92%);
    border: 0;
    box-shadow:
      inset 0 3px 0 var(--color-dradis),
      inset 0 -3px 0 var(--color-dradis);
  }

  .mast {
    display: flex;
    justify-content: flex-end;
    border-right: 2px solid var(--color-dradis-deep);
  }

  .actions {
    display: flex;
    justify-content: flex-start;
    border-left: 2px solid var(--color-dradis-deep);
  }

  .mast-inner,
  .actions-inner {
    width: min(400px, 100%);
    padding: 32px 28px;
  }

  .mast-inner {
    display: flex;
    flex-direction: column;
    /* safe: a short window keeps the top of the column reachable instead of clipping it. */
    justify-content: safe center;
  }

  .actions-inner {
    justify-content: safe center;
  }

  .mark {
    width: 128px;
    height: 128px;
  }

  .title {
    font-size: 48px;
  }
}

/* In the CIC lane: one centred column over the empty playfield, whatever the window width. */
.stage.in-lane {
  align-items: safe center;
  padding: var(--space-4);
  overflow: auto;
  background: transparent;
}

.stage.in-lane .board {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: min(440px, 100%);
  height: auto;
}

.stage.in-lane .mast,
.stage.in-lane .actions {
  display: block;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.stage.in-lane .mast-inner,
.stage.in-lane .actions-inner {
  width: auto;
  padding: 0;
  text-align: center;
}

.stage.in-lane .wordmark {
  align-items: center;
}

.stage.in-lane .well {
  min-height: 0;
}
</style>
