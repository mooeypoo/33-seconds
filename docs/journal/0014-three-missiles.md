# 0014 — Three missiles, one press

**Date:** 2026-09-21
**Slice:** first slice of M4
**Ends with:** a lock reticle and three missiles you actually fire.

---

## What we set out to do

The gun is always on. Missiles are the first thing you *choose* to fire: three per cycle, aimed
at the nearest hostile in a forward cone, hitting whatever is first on the path.

Not in this slice: pickups, upgrade-swapped targeting, The Speech, cards, or Viper Pilot numbers.

## What we built

- **Rack of 3**, refilled at the jump with hull. Holding Space does not dump it.
- **70° cone**, nearest lock, lowest id on a tie. Reticle is a ring with a four-quadrant cross.
- **First body on the path** soaks, even when the reticle is further on. One-shots a Raider;
  8 damage to the resurrection ship.
- Phone: large `data-ui` button (one-handed) plus the existing second-finger latch.
- Title hint names Space. A hold across Recovering is not a free launch on Continue.

## What we assumed

- 280 wu/s and 8 ship damage until play. The gun is still the main chip.
- Perfect homing, no turn cap. Escorts soak because hits use the path, not the lock id.

## What we tested

Ammo, rising edge, jump refill, a Raider kill, 8 damage to the ship when it is the lock,
along-order on a shared path, Recovering cannot fire, a hold across Recovering is not a launch.
Two sabotages: an empty rack that still fires, and a lock that prefers the farthest body.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts and the wreck when the loop is offline, fleet idle, missile sprite.
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, The Speech, upgrade cards.
