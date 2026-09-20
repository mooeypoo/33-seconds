import { describe, expect, it } from 'vitest';
import { DEAD_ZONE_PX, MAX_RADIUS_PX, stickVector } from '../src/infrastructure/input/PointerStickInput';

/**
 * The drag stick's feel in one pure function: how far you drag decides how fast you fly. This is
 * the part players notice and the part a refactor can quietly ruin, so it is tested directly even
 * though it lives in an adapter.
 */
describe('the drag stick', () => {
  it('asks for nothing inside the dead zone, so resting a thumb does not drift', () => {
    expect(stickVector(0, 0)).toEqual({ x: 0, y: 0, strength: 0 });
    expect(stickVector(DEAD_ZONE_PX - 1, 0).strength).toBe(0);
    expect(stickVector(3, 3).strength).toBe(0);
  });

  it('ramps up from the dead zone to full speed at the maximum radius', () => {
    const justOut = stickVector(DEAD_ZONE_PX + 1, 0).strength;
    const halfway = stickVector((DEAD_ZONE_PX + MAX_RADIUS_PX) / 2, 0).strength;
    const atRadius = stickVector(MAX_RADIUS_PX, 0).strength;

    expect(justOut).toBeGreaterThan(0);
    expect(justOut).toBeLessThan(0.1);
    expect(halfway).toBeCloseTo(0.5, 1);
    expect(atRadius).toBe(1);
  });

  it('never asks for more than full speed, however far the finger travels', () => {
    const wayPastTheRing = stickVector(MAX_RADIUS_PX * 20, MAX_RADIUS_PX * 20);

    expect(wayPastTheRing.strength).toBe(1);
    expect(Math.hypot(wayPastTheRing.x, wayPastTheRing.y)).toBeCloseTo(1, 6);
  });

  it('points where the finger pulls', () => {
    expect(stickVector(-MAX_RADIUS_PX, 0)).toMatchObject({ x: -1, y: 0 });
    expect(stickVector(0, -MAX_RADIUS_PX)).toMatchObject({ x: 0, y: -1 });
  });

  it('treats a diagonal drag as one direction, not two added together', () => {
    const diagonal = stickVector(MAX_RADIUS_PX, MAX_RADIUS_PX);

    // Full strength, but split across both axes rather than full speed on each.
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1, 6);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 6);
  });
});
