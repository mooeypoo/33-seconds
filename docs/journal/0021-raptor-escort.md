# 0021 — Raptor Escort

**Date:** 2026-09-21
**Slice:** the bodyguard body on the fleet line
**Ends with:** an olive wedge that eats strays, then hangars.

---

## What we set out to do

*Raptor Escort* needs a body, not a chance roll. One escort per stack patrols the civilian line
and soaks strays that land on it. Three hits and it hangars until the next cycle.

Not in this slice: Imaginary Six, a swept intercept, soaking strafes, or real `raptor` art.

## What we built

- One Raptor per stack (max 2), launched at cycle start at full 3 HP, spread along the line,
  opposite patrol directions.
- Soak is spatial: a stray whose landing x is within 10 wu of the nearest on-station escort.
  Order is Raptor, then flak, then fleet. Strafes still land.
- Hangar after 3 hits. HUD `raptor n/max` or `hangar`. Placeholder olive wedge and pips.

## What we assumed

10 wu and 40 wu/s until play. Soak is a landing-x test, not a swept 3D intercept. Cycle start
always relaunches every stack at 3 HP, hangared or damaged.

## What we tested

Patrol bounce and a 3-hit hangar; no escort without the card; one and two stacks; a stray soak
with the card; relaunch at full hull next cycle; a strafe still dents the fleet. Two sabotages:
a soak that never lands, and a launch that stays in the barn.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames, real `raptor`.
7. Ship path, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP card (Imaginary Six).
