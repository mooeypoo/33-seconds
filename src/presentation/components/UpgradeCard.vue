<script setup lang="ts">
import { computed } from 'vue';
import type { CardRarity } from '../../application/upgradeOffer';
import type { UpgradeCardFace } from '../upgradeCardFace';
import { portraitSrc } from '../portraits';

/**
 * One card on the Recovering table (PRD 10, ADR-0002 2.3). The rarity is a word and a frame style,
 * never colour alone. The joke is up front; the exact effect and the two advisors sit under it.
 * A phone shows those only once the card is opened; a wide window shows them all at once.
 *
 * The whole card selects, not only the face: the effect and the advisors are half of a wide card,
 * and players click there. The face stays a button for the keyboard and screen readers; its click
 * bubbles up to the card, so Enter and Space still select.
 */

const props = defineProps<{ card: UpgradeCardFace; selected: boolean; expanded: boolean; wide: boolean }>();
const emit = defineEmits<{ select: [id: string] }>();

const RARITY_WORD: Record<CardRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  questionable: 'Questionable',
};

const baltarSrc = portraitSrc('Baltar', 'closed');
const roslinSrc = portraitSrc('Roslin', 'closed');

/** What taking it does to your stack: new, or the count this pick would become. */
const stack = computed(() => {
  const { owned, maxStacks } = props.card;
  if (owned > 0) return `Owned ${String(owned)}/${String(maxStacks)} → ${String(owned + 1)}/${String(maxStacks)}`;
  return maxStacks === 1 ? 'One copy' : `New · up to ${String(maxStacks)}`;
});

/** A phone keeps the banner for the open card, so three closed cards still fit the lane. */
const showArt = computed(() => props.wide || props.expanded);
</script>

<template>
  <article data-ui class="card" :class="[card.rarity, { selected, wide }]" @click="emit('select', card.id)">
    <span v-if="selected" class="selected-tag">Selected</span>
    <button
      data-ui
      type="button"
      class="face"
      :aria-pressed="selected"
      :aria-expanded="expanded"
      :aria-controls="`detail-${card.id}`"
      :data-testid="`upgrade-${card.id}`"
    >
      <span class="meta">
        <span class="rarity">{{ RARITY_WORD[card.rarity] }}</span>
        <span class="stack">{{ stack }}</span>
      </span>
      <span v-if="showArt" class="art" aria-hidden="true">
        <img v-if="card.art" :src="card.art" alt="" width="672" height="216" />
      </span>
      <span class="title">{{ card.title }}</span>
      <span class="joke">{{ card.joke }}</span>
    </button>

    <div v-if="expanded" :id="`detail-${card.id}`" class="detail">
      <div class="effect">
        <span class="label">Effect</span>
        <p class="plain">{{ card.plain }}</p>
      </div>
      <div v-if="card.advice?.baltar" class="advisor" data-testid="advisor-baltar">
        <img v-if="baltarSrc" class="portrait" :src="baltarSrc" alt="" width="36" height="36" />
        <p><span class="who">Baltar.</span> {{ card.advice.baltar }}</p>
      </div>
      <div v-if="card.advice?.roslin" class="advisor" data-testid="advisor-roslin">
        <img v-if="roslinSrc" class="portrait" :src="roslinSrc" alt="" width="36" height="36" />
        <p><span class="who">Roslin.</span> {{ card.advice.roslin }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-space);
  border: 1px solid var(--color-dradis-line);
  border-radius: 10px;
}

.card.wide {
  padding: var(--space-4);
  min-height: 0;
}

/* Rarity: a heavier or doubled frame as well as a colour, and the word on the card (PRD 15). */
.card.uncommon {
  border: 2px solid var(--color-brass);
}

.card.questionable {
  border: 3px double var(--color-amber);
}

/* Selected: a Dradis ring outside the rarity frame, and the word "Selected". */
.card.selected {
  box-shadow:
    0 0 0 3px var(--color-space),
    0 0 0 5px var(--color-dradis);
}

.selected-tag {
  position: absolute;
  top: -12px;
  left: var(--space-4);
  padding: 1px 10px;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 15px;
  color: var(--color-dradis-night);
  background: var(--color-dradis);
  border-radius: 4px;
}

.face {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0;
  text-align: left;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
  font: inherit;
}

.face:focus-visible {
  outline: 2px solid var(--color-dradis-soft);
  outline-offset: 4px;
  border-radius: 4px;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 15px;
}

.rarity {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

.uncommon .rarity {
  color: var(--color-brass);
}

.questionable .rarity {
  color: var(--color-amber);
}

.stack {
  color: var(--color-text-muted);
}

/*
 * The banner: a 672x216 picture, one file pixel per screen pixel on a 2x desktop (336 CSS px) and a
 * 3x phone (224 CSS px), smoothly scaled anywhere else (SPRITE-FILES, ART-SCALE). Sized by aspect
 * ratio, so a narrow card shrinks the picture instead of squashing it.
 */
.art {
  align-self: center;
  width: 224px;
  aspect-ratio: 672 / 216;
  box-sizing: border-box;
  display: block;
  background: var(--color-dradis-night);
  border: 1px dashed var(--color-dradis-line);
}

.wide .art {
  width: 336px;
  max-width: 100%;
}

.art img {
  display: block;
  width: 100%;
  height: 100%;
  /* An illustration, not pixel art: smooth scaling keeps its detail when shrunk. */
  image-rendering: auto;
}

.art:has(img) {
  border: 0;
}

.title {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 24px;
  line-height: 1.05;
  color: var(--color-text-strong);
}

.wide .title {
  font-size: 30px;
}

.joke {
  font-size: 15px;
  line-height: 1.4;
  font-style: italic;
  color: var(--color-text-muted);
}

.detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.effect {
  border-top: 1px solid var(--color-dradis-line);
  padding-top: var(--space-2);
}

.label {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-dradis-soft);
}

.plain {
  margin: var(--space-1) 0 0;
  font-size: 15px;
  line-height: 1.4;
  color: var(--color-text);
}

.advisor {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.advisor p {
  margin: 0;
  font-size: 14px;
  line-height: 1.35;
}

.portrait {
  flex: none;
  width: 36px;
  height: 36px;
  image-rendering: pixelated;
}

.who {
  font-weight: 700;
}
</style>
