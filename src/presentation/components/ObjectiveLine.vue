<script setup lang="ts">
import { computed } from 'vue';
import copy from '../../content/hud.json';
import type { ObjectiveId } from '../../application/HudViewModel';
import { hudStore } from '../stores/hudStore';

/**
 * One line that says what the run wants right now (ADR-0002 1.6). The words are content, in
 * `content/hud.json`, so they can be rewritten without code.
 */
const OBJECTIVES: Record<ObjectiveId, string> = copy.objectives;

const text = computed(() => {
  const hud = hudStore.state.hud;
  if (!hud) return null;
  return OBJECTIVES[hud.objective];
});
</script>

<template>
  <p v-if="text" class="objective" data-testid="objective">{{ text }}</p>
</template>

<style scoped>
.objective {
  pointer-events: none;
  margin: 0;
  font-size: 14px;
  line-height: 1.3;
  color: var(--color-text-muted);
}
</style>
