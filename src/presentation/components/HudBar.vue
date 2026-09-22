<script setup lang="ts">
import CycleClock from './CycleClock.vue';
import FleetReadout from './FleetReadout.vue';
import type { SessionPhase } from '../../application/GameSession';
import { hudStore } from '../stores/hudStore';

defineProps<{ phase: SessionPhase }>();
const emit = defineEmits<{ pause: [] }>();

const stats = hudStore.state;
</script>

<template>
  <div class="hud">
    <!--
      Debug readout for the platform check (ADR-0001 D4), and how the end-to-end tests observe the
      simulation without a hook into the game. It goes away once the real HUD arrives.
    -->
    <p v-if="stats.showDebug && stats.stats" class="debug" data-testid="debug">
      {{ stats.stats.fps }} fps · {{ stats.stats.ticks }} ticks · {{ stats.stats.renderWidth }}×{{
        stats.stats.renderHeight
      }}
      @ {{ stats.stats.scale }}× · {{ phase }}<br />
      viper <span data-testid="viper-x">{{ stats.stats.viperX }}</span
      >, <span data-testid="viper-y">{{ stats.stats.viperY }}</span> · shots
      <span data-testid="shots">{{ stats.stats.shots }}</span> · kills
      <span data-testid="kills">{{ stats.stats.kills }}</span> · hull
      <span data-testid="hull">{{
        stats.stats.ejected ? 'ejected' : `${String(stats.stats.hull)}/${String(stats.stats.hullMax)}`
      }}</span>
      · raiders <span data-testid="raiders">{{ stats.stats.raiders }}</span> · ghost
      <span data-testid="ghosts">{{ stats.stats.ghosts }}</span> ·
      <span data-testid="returned">{{
        stats.stats.returned ? 'returned' : stats.stats.ghosts ? 'downloading' : stats.stats.raiderLive ? 'fresh' : '—'
      }}</span>
      · ship
      <span data-testid="ship">{{
        stats.stats.shipDestroyed
          ? 'down'
          : stats.stats.shipHp === null
            ? '—'
            : stats.stats.shipShielded
              ? 'shielded'
              : `${String(stats.stats.shipHp)}/${String(stats.stats.shipHpMax)} ${
                  stats.stats.shipBaysOpen ? 'bays' : 'sealed'
                }`
      }}</span>
      ·
      <span data-testid="resurrections">{{ stats.stats.resurrectionsActive ? 'loop' : 'offline' }}</span>
      · missiles
      <span data-testid="missiles">{{ stats.stats.missiles }}/{{ stats.stats.missilesMax }}</span>
      · speech
      <span data-testid="speech">{{
        stats.stats.speechActive
          ? 'talking'
          : stats.stats.speechReady
            ? 'ready'
            : `${String(stats.stats.speechJumpsUntilReady)} jumps`
      }}</span>
      ·
      <span data-testid="tier">{{ stats.stats.tier === 'viper-pilot' ? 'pilot' : 'civilian' }}</span>
      · cards
      <span data-testid="cards">{{ stats.stats.cards }}</span>
      <span v-if="stats.stats.raptorHpMax > 0" data-testid="raptor">
        ·
        {{
          stats.stats.raptorHp === 0
            ? 'hangar'
            : `raptor ${String(stats.stats.raptorHp)}/${String(stats.stats.raptorHpMax)}`
        }}
      </span>
      <span v-if="stats.stats.sixPresent" data-testid="six"> · six</span>
      <span v-if="stats.stats.cylonEye" data-testid="cylon-eye"> · two transponders</span>
    </p>

    <FleetReadout v-if="phase === 'running' || phase === 'paused' || phase === 'resuming'" />
    <CycleClock v-if="phase === 'running' || phase === 'paused' || phase === 'resuming'" />

    <button
      v-if="phase === 'running'"
      data-ui
      class="pause-button"
      type="button"
      aria-label="Pause"
      @click="emit('pause')"
    >
      ⏸
    </button>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  /* Transparent to pointer input, so a thumb landing here still steers (ADR-0001 D5). */
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  /* Keep out of the notch and the home bar. */
  padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) 0
    max(8px, env(safe-area-inset-left));
  font-family: ui-monospace, monospace;
  color: #7fd6a0;
}

.debug {
  margin: 0;
  flex: 1;
  font-size: 12px;
  line-height: 1.4;
  text-shadow: 0 1px 0 #000;
}

.pause-button {
  /* At least 44x44 px, inside the safe area (PRD 13.2). */
  pointer-events: auto;
  min-width: 44px;
  min-height: 44px;
  font-size: 18px;
  color: #cfe8d8;
  background: rgb(12 20 28 / 80%);
  border: 1px solid #2c4a3a;
  border-radius: 6px;
  cursor: pointer;
}

.pause-button:focus-visible {
  outline: 2px solid #7fd6a0;
  outline-offset: 2px;
}
</style>
