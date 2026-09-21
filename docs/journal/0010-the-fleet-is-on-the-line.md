# 0010 — The fleet is on the line

**Date:** 2026-09-21
**Slice:** second slice of M3
**Ends with:** ten placeholder hulls at the bottom, and a stray that notches one of them.

---

## What we set out to do

The integrity number was easy to miss. This slice puts civilians on the line so a hit has a body.

Not in this slice: flak, strafing, a lose screen, silly ship names, or the late-cycle FTL border.

## What we built

- **Ten hulls** on the olive line, matching the HUD pips. The middle one is a bit larger
  (Galactica, visually only).
- **Hit tell.** A stray notches the nearest hull with an orange mark that stays until the next
  hit or the jump. Dinged hulls match missing pips. No flash.

## What we assumed

- One integrity pool still. Ships are a tell, not ten separate health bars.
- Galactica has no rules yet. It just looks like the bigger ship in the line.

## What we tested

Ten hulls; a left stray marks ship 0 and a right stray marks ship 9; six points ding one hull;
repair clears the notch. One sabotage: a fleet that is not ten.

## What is still open

1. Flak, strafing, a lose screen.
2. Mid-cycle life pickups, with the bonus cards.
3. Straight-down fire, if bodyguarding still feels like a fast eject.
4. A quiet FTL border when 10 or 5 seconds remain.
