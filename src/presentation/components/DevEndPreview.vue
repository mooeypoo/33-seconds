<script setup lang="ts">
import { SCORE_WEIGHTS } from '../../balance/scoring';
import { endingLines, reactionCount, type RunOutcome } from '../../application/endings';
import type { RunResult } from '../../application/runResult';
import { listChallenges, pickVerdict, weeklyChallenge } from '../../application/challenges';
import { createRandomStream } from '../../domain/shared/random';
import { maxStacksFor, STARTER_CARDS } from '../../domain/progression/catalog';
import { scoreRun, type RunFacts } from '../../domain/scoring/score';

/**
 * DEVELOPMENT ONLY. Opens the end screen with a made-up run, so it can be looked at without
 * playing one. App.vue loads this only in `npm run dev` and the Playwright build; the production
 * build leaves it out, and `scripts/check-dev-tools-stripped.mjs` fails the build if it leaks.
 * Each press shows the next headline and the next most-killed reaction, so repeated presses walk
 * every line.
 */
const emit = defineEmits<{ preview: [result: RunResult] }>();

const nextLine: Record<RunOutcome, number> = { won: 0, lost: 0 };
let nextReaction = 0;
let nextChallenge = 0;

function roll(max: number): number {
  return Math.floor(Math.random() * (max + 1));
}

/** With `challenge`, the result is the next set challenge's, with a verdict from its score's band. */
function simulate(outcome: RunOutcome, challenge = false): void {
  const won = outcome === 'won';
  const cycle = won ? 5 + roll(4) : 2 + roll(6);
  const shipPercent = won ? 100 : roll(99);
  const facts: RunFacts = {
    won,
    cycle,
    raiderKills: cycle * (8 + roll(10)),
    heavyKills: roll(cycle - 1),
    resurrectionShipDamage: Math.round((shipPercent / 100) * 40),
    resurrectionShipDestroyed: won,
    ejects: roll(8),
    fleetDamagePercent: cycle * (10 + roll(25)),
    fleetLeftPercent: won ? 20 + roll(80) : 0,
    mostKilled: { identityId: 1 + roll(20), kills: 2 + roll(15) },
  };
  const lines = endingLines(outcome);
  const line = lines[nextLine[outcome] % Math.max(1, lines.length)];
  nextLine[outcome] += 1;
  const cards = STARTER_CARDS.filter(() => Math.random() < 0.35).map((card) => ({
    id: card.id,
    stacks: 1 + roll(maxStacksFor(card.rarity) - 1),
  }));
  const score = scoreRun(facts, SCORE_WEIGHTS);
  const weekly = weeklyChallenge(new Date());
  const challenges = [...(weekly ? [weekly] : []), ...listChallenges()];
  const played = challenge ? challenges[nextChallenge++ % Math.max(1, challenges.length)] : undefined;
  emit('preview', {
    outcome,
    tier: Math.random() < 0.7 ? 'viper-pilot' : 'civilian-ship',
    score,
    cycle,
    raiderKills: facts.raiderKills,
    heavyKills: facts.heavyKills,
    ejects: facts.ejects,
    fleetLeftPercent: facts.fleetLeftPercent,
    resurrectionShipPercent: shipPercent,
    mostKilled: facts.mostKilled ? { ...facts.mostKilled, reaction: nextReaction++ % Math.max(1, reactionCount()) } : null,
    cards,
    headlineId: line?.id ?? `${outcome}-01`,
    challenge: played
      ? { key: played.key, verdictId: pickVerdict(played.key, score, createRandomStream(roll(1_000_000))) }
      : null,
  });
}
</script>

<template>
  <div class="dev" data-ui data-dev-tools aria-label="Development tools">
    <span class="tag">dev</span>
    <button data-ui type="button" @click="simulate('won')">Simulate win</button>
    <button data-ui type="button" @click="simulate('lost')">Simulate lose</button>
    <button data-ui type="button" @click="simulate(Math.random() < 0.5 ? 'won' : 'lost', true)">Simulate challenge</button>
  </div>
</template>

<style scoped>
.dev {
  position: fixed;
  left: 8px;
  bottom: 8px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: var(--color-shadow);
  border: 1px dashed var(--color-amber);
  font-family: var(--font-body);
  font-size: 12px;
}

.tag {
  color: var(--color-amber);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

button {
  min-height: 32px;
  padding: 0 8px;
  font: inherit;
  color: var(--color-amber);
  background: transparent;
  border: 1px solid var(--color-amber);
  cursor: pointer;
}
</style>
