<script setup lang="ts">
import { ref } from 'vue';
import CycleClock from './CycleClock.vue';
import MuteControl from './MuteControl.vue';
import type { SessionPhase } from '../../application/GameSession';
import { hudStore } from '../stores/hudStore';

defineProps<{ phase: SessionPhase; allowPause?: boolean }>();
const emit = defineEmits<{ pause: []; about: [] }>();
const settingsOpen = ref(false);

function toggleSettings(): void {
  settingsOpen.value = !settingsOpen.value;
}

function pause(): void {
  settingsOpen.value = false;
  emit('pause');
}

function about(): void {
  settingsOpen.value = false;
  emit('about');
}

const stats = hudStore.state;
</script>

<template>
  <div class="hud">
    <!--
      Development aid, and the window the end-to-end tests read. A shipped build leaves showDebug
      false, so this is not part of the game. On a wide window it floats in the side margin.
    -->
    <p v-if="stats.showDebug && stats.stats && phase !== 'title'" class="debug" data-testid="debug">
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

    <!-- The visible 33 is painted in the playfield. This copy is for assistive tech and tests. -->
    <CycleClock v-if="phase === 'running' || phase === 'paused' || phase === 'resuming'" class="clock-mirror" />

    <div v-if="phase === 'running' || phase === 'paused' || phase === 'resuming'" class="controls">
      <button
        data-ui
        class="hud-button cog"
        type="button"
        aria-label="Settings"
        :aria-expanded="settingsOpen"
        @click="toggleSettings"
      >
        ⚙
      </button>
      <div class="menu" :class="{ open: settingsOpen }" data-ui>
        <MuteControl compact />
        <button v-if="phase === 'running' && allowPause !== false" data-ui class="hud-button" type="button" @click="pause">
          Pause
        </button>
        <button v-if="phase === 'running' && allowPause !== false" data-ui class="hud-button" type="button" @click="about">
          About
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hud {
  position: relative;
  /* Transparent to pointer input, so a thumb landing here still steers (ADR-0001 D6). */
  pointer-events: none;
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-monospace, monospace;
  color: #b8ffdc;
}

.debug {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 6;
  width: 220px;
  margin: 0;
  pointer-events: none;
  font-size: 11px;
  line-height: 1.35;
  color: #8a9b58;
  text-shadow: 0 1px 0 #000;
}

@media (max-width: 959px) {
  .debug {
    display: none;
  }
}

.hud :deep(.clock-mirror) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.controls {
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.hud-button {
  /* At least 44x44 px, inside the safe area (PRD 13.2). */
  pointer-events: auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  color: #cfe8d8;
  background: rgb(12 20 28 / 80%);
  border: 1px solid #2c4a3a;
  border-radius: 6px;
  cursor: pointer;
}

.hud-button:focus-visible {
  outline: 2px solid #7fd6a0;
  outline-offset: 2px;
}

.cog {
  display: none;
  font-size: 20px;
  line-height: 1;
}

.menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Sound, Pause, and About need about 440px beside the fleet score. */
@container topband (max-width: 440px) {
  .cog {
    display: inline-block;
  }

  .menu {
    display: none;
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 5;
    flex-direction: column;
    align-items: stretch;
    padding: 8px;
    background: #0b0e14;
    border: 1px solid #2c4a3a;
  }

  .menu.open {
    display: flex;
  }
}
</style>
