<script setup lang="ts">
import { computed } from 'vue';
import flair from '../../content/upgrades.flair.json';
import type { CommsLine } from '../../application/banter/Banter';
import { portraitSrc } from '../portraits';
import { hudStore } from '../stores/hudStore';
import CommsOverlay from './CommsOverlay.vue';
import SpeechBanner from './SpeechBanner.vue';

/**
 * The right CIC console (ADR-0002 Phase 2): who is talking, what was said, the cards you hold, and
 * the missile and Speech state with their keys. Desktop has no action buttons, so this is where
 * those numbers live. On the title it stands by and its slot holds the quote.
 */
const props = defineProps<{
  standby: boolean;
  comms: CommsLine | null;
  log: readonly CommsLine[];
  speaking: boolean;
}>();

/** The console shows a few recent lines; the full log is the pause menu's (PRD 12.2). */
const LOG_LINES_SHOWN = 3;

const titles = new Map((flair as { id: string; title: string }[]).map((card) => [card.id, card.title]));
const hud = computed(() => hudStore.state.hud);

/** Lines before the one on the strip, newest first. */
const recent = computed(() => {
  const earlier = props.comms ? props.log.slice(0, -1) : props.log;
  return earlier
    .slice(-LOG_LINES_SHOWN)
    .reverse()
    .map((line, index) => ({
      key: `${String(index)}-${line.speakerName}-${line.text}`,
      who: line.speakerName,
      text: line.text,
      src: portraitSrc(line.speakerName, 'closed'),
    }));
});

const cards = computed(() =>
  (hud.value?.loadout ?? [])
    .map((card) => ({
      id: card.id,
      title: titles.get(card.id) ?? card.id,
      stacks: card.maxStacks > 1 ? `${String(card.stacks)}/${String(card.maxStacks)}` : '',
      rarity: card.rarity,
    }))
    .reverse(),
);
const newest = computed(() => cards.value[0] ?? null);

const missiles = computed(() => `${String(hud.value?.missiles ?? 0)}/${String(hud.value?.missilesMax ?? 0)}`);
const speech = computed(() => {
  if (!hud.value) return '—';
  if (hud.value.speechActive) return `${hud.value.speechRemainingSeconds.toFixed(1)} s`;
  if (hud.value.speechReady) return 'Ready';
  const jumps = hud.value.speechJumpsUntilReady;
  return `${String(jumps)} ${jumps === 1 ? 'jump' : 'jumps'}`;
});
</script>

<template>
  <aside class="console" :class="{ standby }" aria-label="Comms console">
    <div class="head">
      <span class="stencil">Comms</span>
      <slot name="controls" />
    </div>

    <template v-if="standby">
      <slot />
      <div class="off grow" />
    </template>

    <template v-else>
      <CommsOverlay v-if="comms" large :comms="comms" />
      <div v-else class="quiet panel">
        <span class="label">Channel open</span>
      </div>
      <SpeechBanner v-if="speaking" docked />

      <section class="panel log when-full" aria-label="Recent comms">
        <span class="label">Log</span>
        <p v-if="recent.length === 0" class="empty">Nothing yet.</p>
        <div v-for="line in recent" :key="line.key" class="entry">
          <img v-if="line.src" class="face" :src="line.src" alt="" width="32" height="32" />
          <p class="said"><strong>{{ line.who }}.</strong> {{ line.text }}</p>
        </div>
      </section>
      <section class="panel row when-compact">
        <span class="label">Log</span>
        <span class="aside">In the pause menu</span>
      </section>

      <section class="panel" aria-label="Loadout">
        <span class="label">Loadout</span>
        <p v-if="!newest" class="empty">No cards yet. One after each jump.</p>
        <ul v-else class="cards when-full">
          <li v-for="card in cards" :key="card.id" class="card" :class="card.rarity">
            <span v-if="card === newest" data-testid="latest-upgrade">{{ card.title }}</span>
            <span v-else>{{ card.title }}</span>
            <span v-if="card.stacks" class="stacks">{{ card.stacks }}</span>
          </li>
        </ul>
        <p v-if="newest" class="newest when-compact">
          {{ newest.title }}<span v-if="cards.length > 1" class="aside"> +{{ cards.length - 1 }}</span>
        </p>
      </section>

      <section class="panel actions" aria-label="Missiles and The Speech">
        <div class="readout">
          <span class="label">Missiles</span>
          <span class="value-row">
            <span class="big" data-testid="missile-ammo">{{ missiles }}</span>
            <kbd class="key">Space</kbd>
          </span>
        </div>
        <div class="readout">
          <span class="label">The Speech</span>
          <span class="value-row">
            <span class="big" data-testid="speech-status">{{ speech }}</span>
            <kbd class="key">E</kbd>
          </span>
        </div>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.console {
  pointer-events: none;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 44px;
}

.stencil,
.label,
.aside,
.big,
.card,
.newest {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
}

.stencil,
.label {
  font-size: 15px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-space);
  border: 1px solid var(--color-dradis-line);
  border-radius: var(--radius);
}

.row {
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
}

.aside {
  font-size: 15px;
  color: var(--color-text-muted);
}

.empty {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

.entry {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.entry:nth-child(n + 4) {
  opacity: 0.7;
}

.face {
  flex: none;
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
}

.said {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
  color: var(--color-text-warm);
}

.cards {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* Rarity is the border style as well as its colour, so it is not colour alone (PRD 15). */
.card {
  display: flex;
  gap: 6px;
  font-size: 15px;
  padding: 1px 7px;
  border: 1px solid var(--color-dradis-line);
  border-radius: 3px;
}

.card.uncommon {
  border: 2px solid var(--color-brass);
  padding: 0 6px;
}

.card.questionable {
  border: 3px double var(--color-amber);
  padding: 0 5px;
}

.stacks {
  color: var(--color-text-muted);
}

.newest {
  margin: 0;
  font-size: 16px;
}

.actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.readout {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.value-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.key {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 14px;
  padding: 0 6px;
  color: var(--color-text-muted);
  border: 1px solid var(--color-dradis-line);
  border-radius: 3px;
}

.big {
  font-size: 26px;
  line-height: 1;
  color: var(--color-dradis-pale);
}

.quiet {
  min-height: 80px;
  justify-content: center;
}

.off {
  background: var(--color-standby);
  border: 1px dashed var(--color-standby-line);
  border-radius: var(--radius);
}

.off.grow {
  flex: 1;
}

.when-compact {
  display: none;
}

/* A laptop: the log moves to the pause menu and the loadout folds to its newest card (ADR-0002 2.1). */
@media (max-width: 1359px), (max-height: 819px) {
  .when-full {
    display: none;
  }

  .when-compact {
    display: flex;
  }

  p.when-compact {
    display: block;
  }
}
</style>
