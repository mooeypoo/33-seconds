# 0019 — Flak Enthusiast

**Date:** 2026-09-21
**Slice:** sixth slice of M4
**Ends with:** Galactica eating some of the mail, if you pick the card.

---

## What we set out to do

The PRD's 40% flak was waiting so the fleet pool stayed readable. The card is how it arrives:
first stack is that 40%, extra stacks add 15%. Visible bursts. Strafes still land.

Not in this slice: Hangar Door Slam / bays, Raptor, Imaginary Six, base flak on every run, or
real `flak_burst` art.

## What we built

- Without the card, every stray that crosses the line still hits. No extra scenario rolls.
- First stack: 40% intercept, seeded. Two stacks 55%, three 70%, cap 85%.
- A puff at the stray and a muzzle on the middle hull (pause-frozen fade). Shape, not a flash.

## What we assumed

The 40% is earned by the card, not a silent default. Strafes are not flak. The roll uses the
scenario stream only when chance is above zero, so seed 1 without the card still means the same
spawns.

## What we tested

Chance math; some intercepts and some hits in one seed; no intercepts without the card; a
sabotage that makes Galactica decorative.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, Spoilers plus, `flak_burst`.
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP cards (Hangar Door Slam, Raptor Escort,
   Imaginary Six).
