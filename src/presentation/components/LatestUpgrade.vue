<script setup lang="ts">
import { computed } from 'vue';
import flair from '../../content/upgrades.flair.json';
import { hudStore } from '../stores/hudStore';

const titles = new Map((flair as { id: string; title: string }[]).map((card) => [card.id, card.title]));

const title = computed(() => {
  const id = hudStore.state.hud?.latestUpgradeId;
  if (!id) return null;
  return titles.get(id) ?? id;
});

const older = computed(() => hudStore.state.hud?.olderUpgradeCount ?? 0);
</script>

<template>
  <p v-if="title" class="latest" data-testid="latest-upgrade">
    <span class="name">{{ title }}</span>
    <span v-if="older > 0" class="more">+{{ older }}</span>
  </p>
</template>

<style scoped>
.latest {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin: 0;
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 13px;
  color: var(--color-text);
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  flex: none;
}
</style>
