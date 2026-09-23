# 0027 — Lines in the HUD band

**Date:** 2026-09-22
**Slice:** load the joke pools, and keep the line in the top band
**Ends with:** a real line at the start of a cycle, readable above the instruments.

---

## What we set out to do

The content pack is pools, with a chance a speaker stays quiet, and placeholders in the
spool reports. The line has to be noticeable and still leave the swarm alone.

Not in this slice: derived quips, Recovering scenes that gate the next cycle, the title
copy, the wingman squad.

## What we built

- Speaker files expand into lines. One chance roll covers a whole pool. `{seconds}`,
  `{percent}`, `{count}`, and `{total}` are filled when the line is chosen. `{count}` is
  healthy civilian hulls, because there is no separate "ready to jump" tally yet.
- The line is a strip at the top of the HUD, above the fleet and the clock. A touch on it
  still steers.
- Starbuck's repeat-offender joke no longer claims a third return.

## What we assumed

Dualla's ready-count is the number of healthy hulls. A wingman squad, and whether lines
should name Starbuck as the pilot, stays parked in PRD 12.5.

## What we tested

A pool expands and a 73-character line is dropped. A missed chance roll leaves Adama
talking. A hit can pick Starbuck. Spool text gets the percent. Pause still holds the line.

## What is still open

1. **Soon:** JSON objects per difficulty, before a third tier.
2. **Soon:** share a finished run.
3. **Later:** a harder return after a win.
4. **Later:** wingman guards, decided together with who the lines address (PRD 12.5).
5. Derived quips, the comms log, the duration setting, scenes that gate.
6. AudioPort and the first sound.
7. Full settings screen (M6).
8. Retry-from-last-jump, epilogue.
9. Mid-cycle life pickups.
10. Straight-down fire.
11. A quiet FTL border when 10 or 5 seconds remain.
12. Graphics pass.
13. Ship path, panic, escape FTL, slow-mo.
14. Missile pickups, blast radius, Later cards.
