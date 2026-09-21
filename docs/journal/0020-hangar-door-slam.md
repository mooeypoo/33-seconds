# 0020 — Hangar Door Slam

**Date:** 2026-09-21
**Slice:** first new-system slice after the starter cards that already had homes
**Ends with:** hangar doors you can see, and a card that pays when they are open.

---

## What we set out to do

*Hangar Door Slam* needs bays. Not a path, not panic, not an escape FTL: an open / sealed cycle
on the factory, a tell that is not only colour, and +30% damage while the doors are open.

Not in this slice: Raptor, Imaginary Six, 75/50/25 bay-dark panic, launch-rate drop, or a real
ship path.

## What we built

- 4 s open / 4 s sealed while the ship is exposed. Starts open when the shield drops. Combat
  ticks only, so Recovering does not walk the doors.
- Shielded and destroyed stay sealed. HUD `bays` / `sealed` next to HP. Doors split (red well)
  or meet (gunmetal).
- *Hangar Door Slam*: +30% per stack on gun and missile hits while open. Without the card the
  doors still cycle.

## What we assumed

4 / 4 until play. Damage is a multiplier on the hit, so a 1-damage round becomes 1.3 and HP can
be fractional (HUD rounds). The 75% panic pass can later *shorten* open windows; it should not
replace this cycle.

## What we tested

Open on expose, seal, open again; Recovering freezes the cycle; slam hurts more while open;
shielded stays sealed. Two sabotages: doors that never cycle, and a slam that does not add
damage.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames.
7. Ship path, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP cards (Raptor Escort, Imaginary Six).
