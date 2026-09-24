<script setup lang="ts">
import { ref } from 'vue';
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
      @ {{ stats.stats.scale }}× · {{ phase }} ·
      <span data-testid="sim">{{ stats.stats.frozen ? 'frozen' : 'live' }}</span><br />
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
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  color: var(--color-dradis-pale);
}

.debug {
  /* Bottom-left: in the CIC shell the top right holds real controls (Pause, About). */
  position: fixed;
  bottom: 12px;
  left: 12px;
  z-index: 6;
  width: 220px;
  margin: 0;
  pointer-events: none;
  font-size: 11px;
  line-height: 1.35;
  color: var(--color-olive);
  text-shadow: 0 1px 0 var(--color-shadow);
}

@media (max-width: 959px) {
  .debug {
    display: none;
  }
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
  color: var(--color-text);
  background: rgb(var(--rgb-panel) / 80%);
  border: 1px solid var(--color-dradis-line);
  border-radius: 6px;
  cursor: pointer;
}

.hud-button:focus-visible {
  outline: 2px solid var(--color-dradis-soft);
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

/* Pause and About need about 440px beside the fleet score. Mute returns with the first sound. */
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
    background: var(--color-space);
    border: 1px solid var(--color-dradis-line);
  }

  .menu.open {
    display: flex;
  }
}
</style>
