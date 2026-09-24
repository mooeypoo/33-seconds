import { describe, expect, it } from 'vitest';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import { createGame } from '../src/domain/game';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { PHONE_WORLD_WIDTH_UNITS } from '../src/domain/shared/world';
import { RAIDER_SPEED_UNITS_PER_SECOND, SINE_AMPLITUDE_UNITS } from '../src/domain/swarm/raider';

/** Straight dives and the occasional shallow weave (ADR-0002 3.2). Raiders hold fire; the gun is off. */
function swayOf(sineShare: number, seconds = 4): Map<number, { minX: number; maxX: number; firstY: number; lastY: number }> {
  const game = createGame({
    seed: 9,
    raidersFire: false,
    viperFires: false,
    tierProfile: { ...DEFAULT_CYCLE_PROFILE, directorCap: [4], swarmFloor: [4], sineShare: [sineShare] },
  });
  const seen = new Map<number, { minX: number; maxX: number; firstY: number; lastY: number }>();
  for (let tick = 0; tick < TICKS_PER_SECOND * seconds; tick++) {
    game.tick(IDLE_INTENT);
    for (const raider of game.view.raiders) {
      const entry = seen.get(raider.id) ?? { minX: raider.x, maxX: raider.x, firstY: raider.y, lastY: raider.y };
      entry.minX = Math.min(entry.minX, raider.x);
      entry.maxX = Math.max(entry.maxX, raider.x);
      entry.lastY = raider.y;
      seen.set(raider.id, entry);
    }
  }
  return seen;
}

describe('flight patterns', () => {
  it('keeps every Raider on its column when the tier has no weavers', () => {
    for (const path of swayOf(0).values()) expect(path.maxX - path.minX).toBe(0);
  });

  it('weaves a shallow sway inside the lane, and still descends at the normal speed', () => {
    for (const path of swayOf(1).values()) {
      const sway = path.maxX - path.minX;
      expect(sway).toBeGreaterThan(SINE_AMPLITUDE_UNITS);
      expect(sway).toBeLessThanOrEqual(2 * SINE_AMPLITUDE_UNITS + 0.001);
      expect(path.minX).toBeGreaterThanOrEqual(0);
      expect(path.maxX).toBeLessThanOrEqual(PHONE_WORLD_WIDTH_UNITS);
    }
    // Descent is unchanged: a weaver covers the same ground downwards as a diver in the same time.
    const any = [...swayOf(1, 2).values()][0];
    expect(any).toBeDefined();
    expect((any?.lastY ?? 0) - (any?.firstY ?? 0)).toBeCloseTo(RAIDER_SPEED_UNITS_PER_SECOND * 2 - RAIDER_SPEED_UNITS_PER_SECOND / TICKS_PER_SECOND, 0);
  });

  it('mixes both when the share is between', () => {
    const paths = [...swayOf(0.5, 3).values()];
    expect(paths.some((path) => path.maxX - path.minX === 0)).toBe(true);
    expect(paths.some((path) => path.maxX - path.minX > 0)).toBe(true);
  });
});
