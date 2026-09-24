<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import flair from '../../content/upgrades.flair.json';
import { SESSION_KEY } from '../injection';
import { portraitSrc } from '../portraits';

/**
 * Recovering pick (PRD 5.1, 10). A row shows the name and the joke. Opening it shows the effect
 * and the two advisors. Apply starts the 3-2-1, then the next cycle. No timer on the choice.
 */
const session = inject(SESSION_KEY);
if (!session) throw new Error('RecoveringOverlay needs SESSION_KEY from main.ts');
const play = session;

interface CardFlair {
  readonly id: string;
  readonly title: string;
  readonly joke: string;
  readonly plain: string;
  readonly advice?: { readonly baltar?: string; readonly roslin?: string };
}

const FLAIR = flair as CardFlair[];
const baltarSrc = portraitSrc('Baltar', 'closed');
const roslinSrc = portraitSrc('Roslin', 'closed');

function readOffer() {
  return play.view.upgradeOffer;
}

const offer = ref(readOffer());
const selectedId = ref<string | null>(null);

const cards = computed(() => {
  const ids = offer.value?.cardIds ?? [];
  return ids.map((id) => FLAIR.find((entry) => entry.id === id) ?? fallback(id));
});

const selected = computed(() => cards.value.find((card) => card.id === selectedId.value) ?? null);

function fallback(id: string): CardFlair {
  return { id, title: id, joke: 'PLACEHOLDER', plain: 'PLACEHOLDER' };
}

/** The stack this pick would become, once the card is already owned. */
function nextStack(id: string): string | null {
  const owned = play.view.loadout.find((card) => card.id === id);
  if (!owned || owned.stacks < 1) return null;
  return `${String(owned.stacks + 1)}/${String(owned.maxStacks)}`;
}

function select(id: string): void {
  selectedId.value = id;
}

function apply(): void {
  const id = selectedId.value;
  if (!id) return;
  play.pickUpgrade(id);
}

function reroll(): void {
  selectedId.value = null;
  play.rerollOffer();
  offer.value = readOffer();
}
</script>

<template>
  <div class="overlay" data-ui role="dialog" aria-modal="true" aria-labelledby="recovering-title">
    <div class="sheet">
      <h2 id="recovering-title">Jump complete</h2>
      <p class="note">Pick one. No timer.</p>

      <div class="list">
        <div v-for="card in cards" :key="card.id" class="row">
          <button
            data-ui
            type="button"
            class="title"
            :aria-expanded="card.id === selectedId"
            :aria-pressed="card.id === selectedId"
            :aria-controls="`detail-${card.id}`"
            :data-testid="`upgrade-${card.id}`"
            @click="select(card.id)"
          >
            <span class="heading">
              <span class="name">{{ card.title }}</span>
              <span v-if="nextStack(card.id)" class="stack">{{ nextStack(card.id) }}</span>
              <span v-if="card.id === selectedId" class="state">Selected</span>
              <span class="chevron" aria-hidden="true">{{ card.id === selectedId ? '▾' : '▸' }}</span>
            </span>
            <span class="joke">{{ card.joke }}</span>
          </button>

          <div v-if="card.id === selectedId" :id="`detail-${card.id}`" class="detail">
            <p class="plain">{{ card.plain }}</p>
            <div v-if="card.advice?.baltar" class="advisor" data-testid="advisor-baltar">
              <img v-if="baltarSrc" class="portrait" :src="baltarSrc" alt="" width="64" height="64" />
              <span v-else class="portrait letter" aria-hidden="true">B</span>
              <p><span class="who">Baltar.</span> {{ card.advice.baltar }}</p>
            </div>
            <div v-if="card.advice?.roslin" class="advisor" data-testid="advisor-roslin">
              <img v-if="roslinSrc" class="portrait" :src="roslinSrc" alt="" width="64" height="64" />
              <span v-else class="portrait letter" aria-hidden="true">R</span>
              <p><span class="who">Roslin.</span> {{ card.advice.roslin }}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="offer?.rerollAvailable"
        data-ui
        type="button"
        class="refresh"
        data-testid="reroll-upgrades"
        @click="reroll"
      >
        Refresh the list
      </button>
      <button
        data-ui
        type="button"
        class="apply"
        data-testid="apply-upgrade"
        :disabled="selected === null"
        @click="apply"
      >
        {{ selected ? `Apply ${selected.title}` : 'Apply' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  /* Opaque enough that the playfield clock does not read through the titles. */
  background: rgb(5 7 10 / 96%);
  color: #cfe8d8;
  font-family: ui-monospace, monospace;
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(22rem, 100%);
  max-height: 100%;
  min-height: 0;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.note {
  margin: 0;
  font-size: 14px;
  text-align: center;
  color: #9fb8ab;
}

.list {
  overflow: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  text-align: left;
  font: inherit;
  font-size: 15px;
  color: #cfe8d8;
  background: transparent;
  border: 1px solid #2c4a3a;
  border-radius: 8px;
  cursor: pointer;
}

.heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title[aria-pressed='true'] {
  border-color: #7fd6a0;
}

.name {
  flex: 1;
  min-width: 0;
}

.stack,
.state {
  flex: none;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.chevron {
  flex: none;
  width: 1em;
  text-align: center;
}

.detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 4px 4px 12px;
}

.plain,
.joke,
.advisor p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.joke {
  font-style: italic;
  color: #9fb8ab;
}

.advisor {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.portrait {
  flex: none;
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
}

.letter {
  display: grid;
  place-items: center;
  background: #14202a;
  font-size: 20px;
}

.who {
  font-weight: 700;
}

.refresh,
.apply {
  flex: none;
  min-height: 44px;
  font: inherit;
  border-radius: 8px;
  cursor: pointer;
}

.refresh {
  color: #cfe8d8;
  background: transparent;
  border: 1px solid #2c4a3a;
  font-size: 15px;
}

.apply {
  min-height: 48px;
  font-size: 18px;
  color: #06110c;
  background: #7fd6a0;
  border: 0;
}

.apply:disabled {
  color: #9fb8ab;
  background: transparent;
  border: 1px solid #2c4a3a;
  cursor: default;
}

.title:focus-visible,
.refresh:focus-visible,
.apply:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}
</style>
