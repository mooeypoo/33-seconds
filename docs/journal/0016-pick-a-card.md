# 0016 — Pick a card

**Date:** 2026-09-21
**Slice:** third slice of M4
**Ends with:** Recovering as a table of three, not a Continue button.

---

## What we set out to do

Missiles and The Speech are chosen in combat. Variety at the jump is a joke with a plain effect.
Six cards whose systems already exist. One free reroll.

Not in this slice: the rest of the catalog, Hangar Door Slam / Spoilers / flak / Raptor / Imaginary
Six, portraits, Baltar and Roslin overlay advice, comms scenes.

## What we built

- Recovering offers three unique cards from the starter six. Same seed, same table.
- Pick one: that *is* Continue. *Ask Baltar Again* once.
- Effects: 25% wider hull, +35% fire / -20% speed, +2 s downloads, slower piercing shots, missiles
  that prefer the factory, one Cylon save per stack per cycle with a still red-eye pixel (HUD also
  says two transponders).
- Placeholder flair in `src/content/upgrades.flair.json`.
- Placeholder ejection seat while you are gone, so a download (hull stays, red-eye) cannot be
  mistaken for eject. Real `pilot_eject` art waits.

## What we assumed

- Cannon pierce is 2 extra bodies, 0.7 speed, 1.5 radius per stack until play.
- Cylon saves are one per stack per cycle, at the current pose, 1.5 s cover. That is a download,
  not a shorter eject: the hull stays. Default death still leaves the board for ~3 s.
- Vendetta skips the cone for the ship; escorts still soak.
- Tests that only need the next cycle may still call Continue without picking.

## What we tested

Offer uniqueness and seed; one reroll; pick leaves Recovering; stack cap hides a card; each of the
six effects; two sabotages: a pick that does not stack, and a free forever reroll.

## What we decided after talking it through

Eject and the card must not share a pop. Eject is downtime: you are gone. The card is a Raider-style
download: you stay. The graphics pass draws a still ejection-seat symbol for eject only
(`pilot_eject` in ART-DIRECTION §10). Play uses a placeholder seat plus HUD `ejected` until then.
The download never uses that symbol; it uses the red-eye and `two transponders`.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
   real `pilot_eject` seat (placeholder until then).
7. Ship path, bays, panic, escape FTL, slow-mo.
8. Missile pickups, blast radius, remaining MVP cards.
