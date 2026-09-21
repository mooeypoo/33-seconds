# 0013 — The civilians can lose

**Date:** 2026-09-21
**Slice:** fifth slice of M3
**Ends with:** a lose overlay when Fleet Integrity hits zero.

---

## What we set out to do

The run can be won. It should also be losable: only the fleet ending the run, never the Viper.

Not in this slice: Viper Pilot numbers (so a normal play cannot actually reach zero yet),
retry-from-last-jump, the epilogue, or flak.

## What we built

- **RunLost** when integrity hits the floor. Session freezes, placeholder overlay, Retry
  returns to the title, Launch is a new Game.
- Tests start the pool at 8 so one dive can prove the overlay. Play still starts at 100.

## What we assumed

- Wiring the screen now is worth it even though Civilian Ship math cannot reach zero.
  Viper Pilot numbers belong in the fairness / hardship pass, not a surprise retune here.

## What we tested

A thin pool plus one strafe is a RunLost; a second tick does not emit it again; the
session freezes and Retry is a new run. One sabotage: a zero pool that does not end the run.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts and the wreck when the loop is offline (ART-DIRECTION §9), fleet idle motion.
7. Ship path, bays, panic, escape FTL, slow-mo.
