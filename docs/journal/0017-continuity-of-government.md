# 0017 — Continuity of Government

**Date:** 2026-09-21
**Slice:** fourth slice of M4
**Ends with:** seven starter cards, and the fleet cap as a pick.

---

## What we set out to do

Grow the Recovering table with the last starter card whose system already exists: the per-cycle
fleet damage cap. Eject vs download was already documented in [0016](0016-pick-a-card.md) (PRD 8.1,
ART-DIRECTION §10, `pilot_eject` later).

Not in this slice: Hangar Door Slam, Spoilers, flak, Raptor, Imaginary Six, or any new system those
need.

## What we built

- *Continuity of Government* in the starter seven. Common, stacks to 3.
- Each stack multiplies the cycle cap by 0.9 (35 → 31.5 → 28.35). Strays and strafes both honour it.
- Placeholder flair in JSON. Roslin still likes a quota.

## What we assumed

Compound, not additive. Three stacks is about 25.5, not 5. Play can retune.

## What we tested

One stack stops short of 35. Two stacks compound. Typecheck, lint, tests.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject` seat (placeholder until then).
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP cards (Spoilers, Hangar Door Slam, Flak Enthusiast,
   Raptor Escort, Imaginary Six). Those wait on ghosts you can shoot, bays, flak, a Raptor, and Six.
