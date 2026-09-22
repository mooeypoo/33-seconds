# 0026 — One line at a time

**Date:** 2026-09-22
**Slice:** the first comms
**Ends with:** a named line over the fight that pause can freeze.

---

## What we set out to do

M5's personality starts as comms that cannot get in the way: one line, from JSON, on the game
clock, never a button.

Not in this slice: the full roster and the 150-line target, derived quips (multi-kill, close
call, kill drought, "who are you talking to"), the comms log, the duration setting, squelch
audio, or Recovering scenes that must finish before the next cycle. The shareable result page
stays parked.

## What we built

- `Banter` reads domain events and picks from `src/content/banter`. Its random stream is not
  the scenario stream.
- Placeholder lines for cycle start, spool, the ship's arrival, a missile, Recovering, win,
  and loss. A letter block plus the speaker's name. Color is not the cue.
- A critical spool line can replace a lower one. An equal line is dropped, not queued. Flavor
  stays quiet at 1 hull. Reading time is the PRD formula, Normal only.
- A touch on the line still steers.

## What we assumed

The Tyrol line during Recovering does not gate the card pick. The rule that the scene must
finish *and* the card be chosen waits until scenes are real beats, not one line.

## What we tested

Parse rejects markup, a bad speaker, and a 73-character line. A normal line is not replaced
by another normal. Flavor drops at 1 hull; spool still speaks, and it replaces a missile
quip. The other spool report wins a high roll. Cooldown blocks a repeat. Pause holds Adama's
opening line. One sabotage: a critical line cannot replace flavor.

## What is still open

1. **Soon:** JSON objects per difficulty, before a third tier.
2. **Soon:** share a finished run. Link back to the site, points and details drawn there,
   offer another game. Image optional. Encode the result in the link.
3. **Later:** a harder return after a win, without making Civilian Run feel like practice.
4. Rest of comms: more lines, derived triggers, log, duration setting, scenes that gate.
5. AudioPort and the first sound.
6. Full settings screen (M6).
7. Retry-from-last-jump, epilogue.
8. Mid-cycle life pickups.
9. Straight-down fire, if bodyguarding still feels like a fast eject.
10. A quiet FTL border when 10 or 5 seconds remain.
11. Graphics pass.
12. Ship path, panic, escape FTL, slow-mo.
13. Missile pickups, blast radius, Later cards.
