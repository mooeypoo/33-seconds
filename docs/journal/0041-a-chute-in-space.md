# 0041 — A chute in space

**Date:** 2026-09-24
**Slice:** the eject marker
**Ends with:** a parachute that drifts until the Viper comes back.

---

## What we set out to do

The eject mark was three bars. It did not read as a seat, and it sat still for the whole wait.

## What we built

A canopy, two lines, and a small seat, in the Viper's own colours. Over the three seconds it swings
out about 10 units and drops about 6, then the pickup replaces it. The arc uses the game tick, so
pause freezes it. Reduced effects keeps the chute and skips the swing. The download card still
never draws it.

## What we left out

No `pilot_eject` sprite. The drift is code, so that one frame can replace the shapes later.
