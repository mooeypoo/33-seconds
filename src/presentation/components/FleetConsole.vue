<script setup lang="ts">
import { computed } from 'vue';
import { GALACTICA_SLOT } from '../../application/fleetRoster';
import { hudStore } from '../stores/hudStore';
import JumpRing from './JumpRing.vue';
import ObjectiveLine from './ObjectiveLine.vue';

/**
 * The left CIC console (ADR-0002 Phase 2): the fleet's health, the jump, the civilian ships by name,
 * and what the run wants. On the title it stands by, and its slot holds the disclaimer.
 * Not data-ui: a touch that lands here still steers, like every other overlay (ADR-0001 D6).
 */
const props = defineProps<{ standby: boolean; names: readonly string[] }>();

const hud = computed(() => hudStore.state.hud);
const percent = computed(() => {
  const max = hud.value?.fleetIntegrityMax ?? 100;
  if (max <= 0) return 0;
  return Math.round(((hud.value?.fleetIntegrity ?? 100) / max) * 100);
});
const filledPips = computed(() => Math.round((hud.value?.fleetIntegrity ?? 100) / 10));

const ships = computed(() => {
  const mask = hud.value?.fleetShips ?? '';
  return props.names.map((name, index) => ({ name, ready: mask[index] !== '0', galactica: index === GALACTICA_SLOT }));
});
const readyCount = computed(() => ships.value.filter((ship) => ship.ready).length);
const dingedCount = computed(() => ships.value.length - readyCount.value);
</script>

<template>
  <aside class="console" :class="{ standby }" aria-label="Fleet console">
    <div class="head">
      <span class="stencil">Fleet · CIC</span>
      <span v-if="standby" class="state">Standby</span>
    </div>

    <template v-if="standby">
      <div class="off tall" />
      <div class="off" />
      <div class="off grow" />
      <slot />
    </template>

    <template v-else>
      <section class="panel" data-testid="fleet-readout">
        <p class="line">
          <span class="label">Fleet health</span>
          <span class="value" data-testid="fleet">{{ percent }}%</span>
        </p>
        <div class="pips" aria-hidden="true">
          <span v-for="n in 10" :key="n" class="pip" :class="{ filled: n <= filledPips }" />
        </div>
      </section>

      <JumpRing />

      <section class="panel ships" aria-label="Civilian fleet">
        <p class="line">
          <span class="label">Civilian fleet</span>
          <span class="count">{{ readyCount }} of {{ ships.length }} ready</span>
        </p>
        <ul class="ship-list when-full">
          <li v-for="ship in ships" :key="ship.name" class="ship">
            <span class="hull" :class="{ galactica: ship.galactica, dinged: !ship.ready }" aria-hidden="true" />
            <span class="name">{{ ship.name }}</span>
            <span class="tag" :class="{ alert: !ship.ready }">{{ ship.ready ? 'Ready' : 'Dinged' }}</span>
          </li>
        </ul>
        <p class="summary when-compact">
          <span v-if="dingedCount > 0" class="alert-text">{{ dingedCount }} dinged</span>
          <span v-else>All ships ready</span>
        </p>
      </section>

      <section class="panel objective">
        <span class="label">Objective</span>
        <ObjectiveLine />
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
  /* Same height as the COMMS header, which holds 44px buttons, so the three headings line up. */
  min-height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stencil,
.label,
.state,
.count,
.tag,
.value,
.summary {
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

.standby .stencil,
.state {
  color: var(--color-dradis-line);
  font-size: 15px;
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

.line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
}

.value {
  font-size: 40px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--color-dradis-pale);
}

.pips {
  display: flex;
  gap: 3px;
}

.pip {
  flex: 1;
  height: 8px;
  background: rgb(var(--rgb-dradis-line) / 70%);
}

.pip.filled {
  background: var(--color-dradis-soft);
}

.ships {
  flex: 1;
  min-height: 0;
}

.count {
  font-size: 15px;
  color: var(--color-text-muted);
}

.ship-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.ship {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
}

.hull {
  flex: none;
  width: 20px;
  height: 6px;
  background: var(--color-civilian-hull);
}

.hull.galactica {
  width: 28px;
}

.hull.dinged {
  background: var(--color-civilian-dinged);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex: none;
  font-size: 14px;
  padding: 0 6px;
  color: var(--color-text-muted);
  border: 1px solid var(--color-dradis-line);
  border-radius: 3px;
}

/* The word and a thicker amber edge, never colour alone (PRD 15). */
.tag.alert {
  color: var(--color-amber);
  border: 2px solid var(--color-amber);
  padding: 0 5px;
}

.summary {
  margin: 0;
  font-size: 16px;
}

.alert-text {
  color: var(--color-amber);
}

.objective {
  border-color: var(--color-dradis-deep);
  background: var(--color-dradis-night);
}

.objective :deep(.objective) {
  font-size: 16px;
  color: var(--color-text-strong);
}

.off {
  height: 120px;
  background: var(--color-standby);
  border: 1px dashed var(--color-standby-line);
  border-radius: var(--radius);
}

.off.tall {
  height: 96px;
}

.off.grow {
  flex: 1;
}

.when-compact {
  display: none;
}

/* A laptop: the ship list folds to one line (owner's collapse order, ADR-0002 2.1). */
@media (max-width: 1359px), (max-height: 819px) {
  .ships {
    flex: none;
  }

  .when-full {
    display: none;
  }

  .when-compact {
    display: block;
  }
}
</style>
