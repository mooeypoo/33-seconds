# 0005 — It shoots back

**Date:** 2026-09-20
**Slice:** second slice of M2
**Ends with:** the Raider firing at you, and a hull that ejects instead of ending the run.

---

## What we set out to do

The clock made this *this* game. It still could not hurt you. This slice is the first time a miss
costs something, and the first time a destroy does not.

Not in this slice: fleet damage from strays, attack tokens, a Director, or ghosts. A stray is
already marked (red aimed, longer orange once it passes you) so the tell exists before it matters.

## What we built

- The Raider aims at the Viper and fires a slower round, only while it is still above you. Past
  that the shot would be a stray at the fleet, and fleet damage is M3.
- Hull starts at 3. A hit takes one. The last hit ejects: no gun, no steering, three seconds, then
  a pickup at the spawn with a short cover so a round already in the cockpit is not a second eject.
  The jump clock keeps moving. Tyrol resets the hull at the jump, even mid-eject.
- Movement tests turn Raider fire off. That is a harness seam, like the seed, not a feature flag.

## What we assumed

- Perfect aim at the Viper's current position. Lead and aim error wait for the combat stream.
- Pickup returns you to the spawn, not to where you died. Recoverable and readable.

## What we tested

A Cylon round dents the hull; three dents eject; the gun is silent during downtime; pickup is a
full hull at the spawn; the cycle does not stop; the jump restores a mid-eject pilot. Two
sabotages: hull that does not dent, and a gun that still works from the Raptor.

## What is still open

1. Ghosts and the Director.
2. Fleet damage from strays, now that the tell exists.
3. The quieter 33, still waiting on the M5 HUD.
