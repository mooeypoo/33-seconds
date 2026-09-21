# 0015 — The Speech

**Date:** 2026-09-21
**Slice:** second slice of M4
**Ends with:** a panic button that freezes the swarm for four seconds.

---

## What we set out to do

Missiles are a chosen shot. The Speech is a chosen pause in the pressure: Raiders hover and hold
fire, you cannot be hit, the 33 keeps running.

Not in this slice: a real Adama portrait or lines, Mandatory Firmware Update, the loadout pick,
or upgrade cards.

## What we built

- **4 seconds**, E or a bottom-left button. Ready at launch, then every 3 jumps.
- Raiders hold station and do not shoot. Incoming rounds that hit the Viper are eaten so they
  do not become fleet strays.
- Placeholder banner. A still cockpit ring on the Viper. HUD `ready` / `talking` / `n jumps`.

## What we assumed

- MVP has only this special; no run-start loadout.
- Eating rounds is kinder than letting them pass into the civilians.

## What we tested

Starts and ends; hover and hold-fire; clock still runs; hold does not retrigger; three jumps
restore it; hull does not drop while it talks. Two sabotages: raiders that keep flying, and a
start that never actually starts.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait.
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, upgrade cards.
