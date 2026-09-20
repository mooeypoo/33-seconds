# 0007 — Two, and a token

**Date:** 2026-09-20
**Slice:** fourth slice of M2
**Ends with:** two Raiders on screen, and only one of them shooting.

---

## What we set out to do

A ghost that refills a cap of one is an empty sky and a wait. The joke needs a swarm, even a tiny
one. This slice is two bodies and the rule that keeps the incoming fire from doubling.

Not in this slice: the fairness pass (hull, hearts, hitbox), fleet damage, a spawn ramp, or more
Raider types.

## What we built

- **Director cap 2.** Fresh columns stay apart. A pending download still reserves its slot, so a
  kill is a dip to one plus a ghost, then a Returned, never a third ship.
- **One attack token.** The nearest Raider above you may fire. The other flies. A sweeping eye
  means armed; a still eye means it is holding fire. That is the tell, not a colour swap.
- **Viper hull pips** on the ship, plus `hull 2/3` on the HUD. Play vanished people with no
  warning; this is a tell, not more hit points.

## What we assumed

- Tokens re-pick by distance every tick. With two ships at the same speed the holder only changes
  when you do. Good enough until something turns or dives.
- We fill both slots immediately. The Arriving / Building ramp can wait; the refill rule is the
  thing to see.

## What we tested

Two on the first tick, never a third; columns follow the seed; a kill leaves one plus a ghost;
only one token is live; two seconds of fire looks like one gun, not two. Two sabotages: a cap
that does not hold, and a token for everyone.

## What is still open

1. A fairness pass: raise Viper hull above a Raider's 3 HP, maybe hearts, Raider hitbox.
   Together, not live.
2. Fleet damage from the stray tell we already have.
3. The quieter 33, still waiting on the M5 HUD.
