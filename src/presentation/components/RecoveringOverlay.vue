<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import flair from '../../content/upgrades.flair.json';
import type { CommsLine } from '../../application/banter/Banter';
import { offerCards } from '../../application/upgradeOffer';
import { SESSION_KEY } from '../injection';
import { hudStore } from '../stores/hudStore';
import CommsOverlay from './CommsOverlay.vue';
import type { UpgradeCardFace } from '../upgradeCardFace';
import UpgradeCard from './UpgradeCard.vue';

/**
 * Recovering pick as cards (PRD 5.1, 10; ADR-0002 2.3). No timer on the choice. A card is selected
 * by its face; Apply starts the 3-2-1, then the next cycle. One free Refresh the list.
 *
 * `wide` is the CIC shell: a full-screen requisition board with three cards side by side, every
 * detail showing, and the Recovering scene in the footer. Otherwise the cards stack in the lane and
 * open one at a time, so a phone reads the joke first.
 */
const props = defineProps<{ wide: boolean; comms: CommsLine | null }>();

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

/** Owner-drawn banners, picked up by file name as they land (docs/art/SPRITE-FILES.md). */
const ART = import.meta.glob<string>('../../../assets/cards/*.png', { eager: true, import: 'default' });
function artFor(id: string): string | null {
  return ART[`../../../assets/cards/${id}.png`] ?? null;
}

const offer = ref(play.view.upgradeOffer);
const hand = ref(offerCards(play.view));
const selectedId = ref<string | null>(null);

const cards = computed<UpgradeCardFace[]>(() =>
  hand.value.map((card) => {
    const text = FLAIR.find((entry) => entry.id === card.id) ?? { id: card.id, title: card.id, joke: '', plain: '' };
    return { ...text, rarity: card.rarity, owned: card.owned, maxStacks: card.maxStacks, art: artFor(card.id) };
  }),
);
const selected = computed(() => cards.value.find((card) => card.id === selectedId.value) ?? null);

const hud = computed(() => hudStore.state.hud);
const cycleIndex = computed(() => hud.value?.cycleIndex ?? 1);

function select(id: string): void {
  if (selectedId.value !== id) session?.cardHighlighted();
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
  offer.value = play.view.upgradeOffer;
  hand.value = offerCards(play.view);
}
</script>

<template>
  <div class="overlay" :class="{ wide }" data-ui role="dialog" aria-modal="true" aria-labelledby="recovering-title">
    <div class="sheet">
      <header class="top">
        <div class="heading">
          <span class="stencil">Jump complete · Cycle {{ cycleIndex }} → {{ cycleIndex + 1 }}</span>
          <h2 id="recovering-title">Requisition. <span class="note">Pick one. No timer.</span></h2>
        </div>
        <p v-if="wide && hud" class="summary">
          <span>Fleet {{ Math.round((hud.fleetIntegrity / hud.fleetIntegrityMax) * 100) }}%</span>
          <span>Hull {{ hud.hull }}/{{ hud.hullMax }} · Missiles {{ hud.missiles }}/{{ hud.missilesMax }}</span>
        </p>
      </header>

      <div class="hand">
        <UpgradeCard
          v-for="card in cards"
          :key="card.id"
          :card="card"
          :selected="card.id === selectedId"
          :expanded="wide || card.id === selectedId"
          :wide="wide"
          @select="select"
        />
      </div>

      <footer class="bottom">
        <!-- Always there on a wide screen, empty or not, so the buttons stay on the right. -->
        <div v-if="wide" class="scene">
          <CommsOverlay v-if="props.comms" docked :comms="props.comms" />
        </div>
        <div class="buttons">
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
      </footer>
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
  align-items: safe center;
  justify-content: center;
  overflow: auto;
  padding: var(--space-4);
  /* Opaque enough that the playfield does not read through the cards. */
  background: rgb(var(--rgb-deep) / 96%);
  color: var(--color-text);
}

/* The CIC shell: a board over the whole screen, not just the lane, and fully opaque over the consoles. */
.overlay.wide {
  position: fixed;
  z-index: 5;
  padding: 24px 32px;
  align-items: stretch;
  background: var(--color-deep);
}

.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(24rem, 100%);
}

.wide .sheet {
  width: min(1376px, 100%);
  gap: var(--space-4);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stencil {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 15px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-weight: 400;
  font-size: 26px;
  color: var(--color-text-strong);
}

.wide h2 {
  font-size: 40px;
}

.note {
  color: var(--color-text-muted);
}

.summary {
  margin: 0;
  display: flex;
  gap: var(--space-4);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 20px;
}

.hand {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-top: var(--space-2);
}

.wide .hand {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  /* Cards are as tall as their words; the row does not stretch them to the footer. */
  align-items: start;
}

.bottom {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.wide .bottom {
  flex-direction: row;
  align-items: center;
  margin-top: auto;
}

/* In the lane, Apply stays in reach while the cards scroll under it. */
.overlay:not(.wide) .bottom {
  position: sticky;
  bottom: calc(-1 * var(--space-4));
  padding: var(--space-3) 0 var(--space-4);
  /* Solid, so the card scrolling under it never reads through Refresh. */
  background: var(--color-deep);
}

.scene {
  flex: 1;
  min-width: 0;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.wide .buttons {
  flex-direction: row;
  flex: none;
}

.refresh,
.apply {
  min-height: 48px;
  padding: 0 var(--space-4);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 18px;
  border-radius: var(--radius);
  cursor: pointer;
}

.refresh {
  color: var(--color-text);
  background: transparent;
  border: 1px solid var(--color-dradis-line);
}

.apply {
  color: var(--color-dradis-night);
  background: var(--color-dradis-soft);
  border: 0;
}

.apply:disabled {
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-dradis-line);
  cursor: default;
}

.refresh:focus-visible,
.apply:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
</style>
