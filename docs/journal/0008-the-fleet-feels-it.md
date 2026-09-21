# 0008 — The fleet feels it

**Date:** 2026-09-20
**Slice:** first slice of M3
**Ends with:** an orange stray that misses you can dent the civilians, and you can see the dent.

---

## What we set out to do

The tell was already there: Cylon rounds turn orange after they pass the Viper. This slice makes
that mean something. The run now has a health bar that is not your hull.

Not in this slice: Galactica's flak, strafing runs, a lose screen, civilian-ship sprites, or the
fairness pass (Viper hull above a Raider's 3 HP).

## What we built

- **Integrity 100.** A stray that crosses a line near the bottom costs 1. No single cycle can take
  more than 35. A jump restores 60% of whatever is missing (Civilian Ship's numbers, until tiers).
- **HUD.** Ten pips plus `n/max` next to the quiet 33. A thin olive line marks the edge. No flicker:
  the orange round is the hit tell.
- **Flak is off.** Every stray that crosses lands, so the first play of the pool is deterministic.

## What we assumed

- Raiders still wrap at the bottom. Bodies are not damage; rounds are.
- Reaching zero does not end the run yet. The number can sit at the floor until the lose screen
  exists.
- Repair runs even on a clean cycle (a no-op at 100). Cheaper than a special case.

## What we tested

A stray takes a point; the cap holds; repair is a fraction of missing, then the cap resets; a
leaping round counts and an aimed one does not; parking left in a real run dents the fleet, and the
jump heals some of it. Two sabotages: a decorative pool, and a cap that does not hold.

## What is still open

1. A fairness pass: raise Viper hull above a Raider's 3 HP, maybe hearts, Raider hitbox, and maybe straight-down fire instead of aimed-at-Viper.
2. Flak at 40%, strafing runs, a lose screen when the pool hits zero.
3. The quieter 33, still waiting on the M5 HUD.
