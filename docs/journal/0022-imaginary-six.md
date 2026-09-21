# 0022 — Imaginary Six

**Date:** 2026-09-21
**Slice:** the last MVP card
**Ends with:** a pale outline beside you that cuts down strafes and strays.

---

## What we set out to do

*Imaginary Six* is the fleet-defense escort only you can see. Formation, a thin beam at about
half a gun hit, strafes then stray rounds, untouchable.

Not in this slice: comms "who are you talking to", a portrait, shooting parked Raiders or the
factory, or the balance harness.

## What we built

- One copy. She sits starboard of the Viper (port if the edge is tight) and leaves while you
  eject.
- Hitscan beam: 0.5 damage, gun interval, 140 wu range. Persistent line to the current target,
  not a strobe. HUD `six`.
- Priority: in-range strafing Raider closest to the fleet, then in-range stray. Parked Raiders
  and the factory are ignored.

## What we assumed

140 wu and half a gun hit until play. A map-wide beam would delete a lone strafe before it
arrived; range keeps her overwatch beside you. Comms wait. Stacking her with flak and the
Raptor is a harness question, not this slice.

## What we tested

Formation and edge flip; gone on eject; no Six without the card; a strafe in range dents and
parked Raiders do not; a stray intercept. Two sabotages: she never appears, and she never
fires.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames, real `raptor`,
   real `imaginary_six`.
7. Ship path, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, Later cards, comms "who are you talking to".
