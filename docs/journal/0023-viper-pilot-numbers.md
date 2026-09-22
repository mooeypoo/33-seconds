# 0023 — Viper Pilot numbers

**Date:** 2026-09-22
**Slice:** the fairness pass that makes a loss reachable
**Ends with:** Launch as Viper Pilot, Civilian Run as the easier fleet, and a title that says so.

---

## What we set out to do

Civilian Run math cannot reach zero. The lose overlay was real and the numbers were not.
Viper Pilot is the default: cap 45, repair 40%, lost on the fifth full-cap cycle.

Not in this slice: JSON-per-difficulty files, a third tier, inviting a harder return after a
win, retry-from-last-jump, the epilogue, abandon run, Director / token retunes, or the harness.

## What we built

- A lean `CycleProfile` (cap and repair only) in `src/balance/tiers.ts`. Domain tests that omit
  a profile stay on Civilian Run numbers.
- Launch injects Viper Pilot. **Civilian Run** is the second button: same fight, the fleet holds
  together better, not a tutorial. The title says they look the same. Fleet HUD: `Pilot` or
  `Civilian`.
- *Continuity of Government* still multiplies whatever cap the tier handed it.

## What we assumed

Only the two fleet numbers differ for now. Director cap, hull, and tokens stay the current
constants until a tier actually changes them.

## What surprised us

The two buttons were a mystery because the sky does not change. Naming the tiers and putting
`Pilot` / `Civilian` on the fleet HUD is the tell until the math is visible in play.

## What we tested

Civilian cap-and-repair never hits zero; Viper Pilot hits zero on the fifth full-cap cycle;
Continuity scales the Pilot cap; Launch defaults to Pilot; a thin pool still ends the run.
Two sabotages: Pilot repair stays 60%, and Pilot cap stays 35.

## What is still open

1. **Soon:** JSON objects per difficulty (typed, validated) so hit / hull / Director / repair
   can move without a code change. Do this before a third tier.
2. **Later:** after a win, invite a return on a harder profile without making Civilian Run feel
   like practice.
3. Retry-from-last-jump, epilogue.
4. **Abandon run** from pause (back to title). M5, with the rest of the pause menu.
5. Mid-cycle life pickups, with the bonus cards.
6. Straight-down fire, if bodyguarding still feels like a fast eject.
7. A quiet FTL border when 10 or 5 seconds remain.
8. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames, real `raptor`,
   real `imaginary_six`.
9. Ship path, panic, escape FTL, slow-mo.
10. Missile pickups, blast radius, Later cards, comms "who are you talking to".
11. Settings, storage, mute, and the rest of M5.
