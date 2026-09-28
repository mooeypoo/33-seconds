<script setup lang="ts">
import { computed } from 'vue';
import copy from '../../content/hud.json';
import type { ObjectiveId } from '../../application/HudViewModel';
import { hudStore } from '../stores/hudStore';

/** On a phone the objective rides at the front of this row, to give the lane its height back. */
const props = defineProps<{ withObjective?: boolean; training?: boolean; drill?: string | null }>();
const SHORT_OBJECTIVES: Record<ObjectiveId, string> = copy.objectivesShort;

/**
 * The words behind every colour tell, in a release build (PRD 15, ADR-0002 1.3). Each item is a
 * short word or number, so a player who cannot tell the colours apart still reads the state.
 */
interface StatusItem {
  readonly key: string;
  readonly text: string;
  /** A state worth a second look: ejected, the spool, a factory you can hurt. Styled, and named. */
  readonly alert?: boolean;
  readonly objective?: boolean;
}

const items = computed<StatusItem[]>(() => {
  const hud = hudStore.state.hud;
  if (!hud) return [];
  const list: StatusItem[] = [];
  // Training says so in words, so nobody mistakes the sim for a real run, and names the drill (PRD 5.5).
  if (props.training) list.push({ key: 'sim', text: props.drill ? `Sim · ${props.drill}` : 'Sim' });
  if (props.withObjective) list.push({ key: 'objective', text: SHORT_OBJECTIVES[hud.objective], objective: true });

  list.push(
    hud.ejected
      ? { key: 'hull', text: 'Ejected', alert: true }
      : { key: 'hull', text: `Hull ${String(hud.hull)}/${String(hud.hullMax)}`, alert: hud.hull <= 1 },
  );
  if (hud.cylonEye) list.push({ key: 'eye', text: 'Two transponders' });
  if (hud.lucky) list.push({ key: 'lucky', text: 'Lucky' });
  list.push({ key: 'loop', text: hud.resurrectionsActive ? 'Loop on' : 'Loop offline' });

  if (hud.shipStatus === 'shielded') list.push({ key: 'ship', text: 'Ship shielded' });
  if (hud.shipStatus === 'exposed') {
    list.push({
      key: 'ship',
      text: `Ship ${String(hud.shipHp)}/${String(hud.shipHpMax)} · ${hud.shipBaysOpen ? 'Bays open' : 'Sealed'}`,
      alert: true,
    });
  }
  if (hud.shipStatus === 'destroyed') list.push({ key: 'ship', text: 'Ship down' });

  if (hud.raptorHpMax > 0) {
    list.push({
      key: 'raptor',
      text: hud.raptorHp === 0 ? 'Raptor hangar' : `Raptor ${String(hud.raptorHp)}/${String(hud.raptorHpMax)}`,
    });
  }
  if (hud.sixPresent) list.push({ key: 'six', text: 'Six' });
  return list;
});
</script>

<template>
  <ul class="status" data-testid="status-row" aria-label="Status" data-lesson-target="status">
    <li
      v-for="item in items"
      :key="item.key"
      class="item"
      :class="{ alert: item.alert, objective: item.objective }"
      :data-testid="`status-${item.key}`"
      :data-lesson-target="item.objective ? 'objective' : undefined"
    >
      {{ item.text }}
    </li>
  </ul>
</template>

<style scoped>
.status {
  pointer-events: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 14px;
  line-height: 1.2;
  padding: 1px 6px;
  color: var(--color-text);
  border: 1px solid var(--color-dradis-line);
  border-radius: 3px;
  white-space: nowrap;
}

.item.objective {
  color: var(--color-text-strong);
  background: var(--color-dradis-night);
  border-color: var(--color-dradis-deep);
}

/* A thicker amber edge as well as the word itself, so the alert is never colour alone. */
.item.alert {
  color: var(--color-amber);
  border: 2px solid var(--color-amber);
  padding: 0 5px;
}
</style>
