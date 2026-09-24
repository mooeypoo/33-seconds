<script setup lang="ts">
/**
 * The jump is a fade, not a white flash (PRD 15, AGENTS.md). Reduced motion keeps the overlay and
 * drops only the animation, so nobody loses the "we left" beat.
 */
</script>

<template>
  <div class="jump-fade" data-testid="jump-fade" role="status">Jumping</div>
</template>

<style scoped>
.jump-fade {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  display: grid;
  place-items: center;
  background: rgb(var(--rgb-ink) / 72%);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size-adjust: var(--display-size-adjust);
  font-size: 18px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  animation: fade-in 180ms ease-out both;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jump-fade {
    animation: none;
  }
}
</style>
