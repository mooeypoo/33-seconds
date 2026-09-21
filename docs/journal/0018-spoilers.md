# 0018 — Spoilers

**Date:** 2026-09-21
**Slice:** fifth slice of M4
**Ends with:** a ghost you can shoot, and a download that waits.

---

## What we set out to do

The last starter card whose missing piece was "ghosts you can shoot." Blips already existed.
Spoilers makes them a target: they sit where the Raider will return, and a gun hit delays that
download 3 seconds per stack.

Not in this slice: Hangar Door Slam / bays, flak, Raptor, Imaginary Six, missiles hitting ghosts,
or real `ghost_blip` art.

## What we built

- With the card, the blip moves to spawn height on the death column. A still plus marks it as a
  target. Without the card the bar stays on the corpse and shots pass through.
- A player round delays that download 3 s per stack and is spent (Cannon can pierce through).
  Live Raiders soak first, so the killing shot is not a free delay. Missiles ignore ghosts.
- Jump still finishes transit. The bar rewinds; a one-beat scale (pause-frozen) is the hit tell.

## What we assumed

- 8 wu ghost hitbox until play. Delay is additive per stack (3, then 6), not a longer bar of a
  different kind. Relocating to spawn Y is the "show where they return" clause.

## What we tested

Shootable pose and a delay; no delay without the card; two stacks add more; a sabotage that
makes delay a no-op.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, real Spoilers plus on `ghost_blip`.
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP cards (Hangar Door Slam, Flak Enthusiast,
   Raptor Escort, Imaginary Six).
