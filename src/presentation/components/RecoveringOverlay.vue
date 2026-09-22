<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { SESSION_KEY } from '../injection';
import flair from '../../content/upgrades.flair.json';

/**
 * Recovering pick (PRD 5.1, 10). No timer. The chosen card starts the next cycle. A comms line
 * may show over this; it does not have to finish first. Full scenes wait.
 */
const session = inject(SESSION_KEY);
if (!session) throw new Error('RecoveringOverlay needs SESSION_KEY from main.ts');
const play = session;

interface CardFlair {
  readonly id: string;
  readonly title: string;
  readonly joke: string;
  readonly plain: string;
}

const FLAIR = flair as CardFlair[];

function readOffer() {
  return play.view.upgradeOffer;
}

const offer = ref(readOffer());

const cards = computed(() => {
  const ids = offer.value?.cardIds ?? [];
  return ids.map((id) => FLAIR.find((entry) => entry.id === id) ?? fallback(id));
});

function fallback(id: string): CardFlair {
  return { id, title: id, joke: 'PLACEHOLDER', plain: 'PLACEHOLDER' };
}

function pick(id: string): void {
  play.pickUpgrade(id);
}

function reroll(): void {
  play.rerollOffer();
  offer.value = readOffer();
}
</script>

<template>
  <div class="recovering">
    <div class="panel" data-ui>
      <h2>Jump complete</h2>
      <p class="lead">Pick one. No timer. PLACEHOLDER comms scene waits.</p>

      <div class="cards">
        <button
          v-for="card in cards"
          :key="card.id"
          data-ui
          type="button"
          class="card"
          :data-testid="`upgrade-${card.id}`"
          @click="pick(card.id)"
        >
          <em class="title">{{ card.title }}</em>
          <span class="joke">{{ card.joke }}</span>
          <span class="plain">{{ card.plain }}</span>
        </button>
      </div>

      <button
        v-if="offer?.rerollAvailable"
        data-ui
        type="button"
        class="reroll"
        data-testid="reroll-upgrades"
        @click="reroll"
      >
        Ask Baltar Again
      </button>
    </div>
  </div>
</template>

<style scoped>
.recovering {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: rgb(8 12 16 / 55%);
  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
}

.panel {
  pointer-events: auto;
  width: min(320px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 16px 14px 18px;
  background: rgb(12 20 28 / 94%);
  border: 1px solid #2c4a3a;
  color: #cfe8d8;
  font-family: ui-sans-serif, system-ui, sans-serif;
  text-align: center;
}

h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.lead {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.35;
  color: #9bb8a8;
}

.cards {
  display: grid;
  gap: 8px;
}

.card {
  display: grid;
  gap: 4px;
  min-height: 44px;
  padding: 10px 12px;
  text-align: left;
  color: #0b0f14;
  background: #c6ced8;
  border: 0;
  cursor: pointer;
}

.card:focus-visible,
.reroll:focus-visible {
  outline: 2px solid #cfe8d8;
  outline-offset: 3px;
}

.title {
  font-size: 15px;
  font-style: italic;
}

.joke {
  font-size: 12px;
  line-height: 1.3;
  color: #2c3a44;
}

.plain {
  font-size: 13px;
  line-height: 1.35;
}

.reroll {
  margin-top: 10px;
  min-height: 44px;
  padding: 0 14px;
  font-size: 14px;
  color: #cfe8d8;
  background: transparent;
  border: 1px solid #2c4a3a;
  cursor: pointer;
}
</style>
