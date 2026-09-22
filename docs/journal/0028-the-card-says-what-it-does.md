# 0028 — The card says what it does

**Date:** 2026-09-22
**Slice:** finish the card text, and speak one line about the hand
**Ends with:** a Recovering table whose jokes and advice are real, and a strip that names a card you can actually pick.

---

## What we set out to do

Each card keeps one joke, one Baltar line, and one Roslin line. The plain effect stays
the rules. Dealing the three, and dealing them again, says one spoken line about a card
on that table. The line does not block the pick.

Not in this slice: "who are you talking to," and Recovering scenes that must finish
before the next cycle.

## What we built

- The nine remaining jokes and advice lines are in `upgrades.flair.json`. The card shows
  both names, so color is not the cue.
- `when.upgrade` survives the loader. A hand, including Ask Baltar Again, can replace
  whatever line was still up. Tyrol's calm line loses to that, because the offer is the
  moment in front of you.
- The strip stays across the top, over the table as well as the fight. A touch on it
  still steers.

## What we assumed

One string per field is enough. Variety stays in the spoken pools, which already have
one line per card.

## What we tested

An offer line is silent when its card is not on the table. A reroll replaces the line.
After a full cycle, the spoken text belongs to one of the three ids that were dealt.

## What is still open

1. **Soon:** JSON objects per difficulty, before a third tier.
2. **Soon:** share a finished run.
3. **Later:** a harder return after a win.
4. **Later:** wingman guards, decided together with who the lines address (PRD 12.5).
5. Derived quips, "who are you talking to," the comms log, the duration setting, scenes that gate.
6. AudioPort and the first sound.
7. Full settings screen (M6).
8. Retry-from-last-jump, epilogue.
9. Mid-cycle life pickups.
10. Straight-down fire.
11. A quiet FTL border when 10 or 5 seconds remain.
12. Graphics pass.
13. Ship path, panic, escape FTL, slow-mo.
14. Missile pickups, blast radius, Later cards.
