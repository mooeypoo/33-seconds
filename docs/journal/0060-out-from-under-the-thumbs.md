# 0060 — Out from under the thumbs

**Date:** 2026-09-27
**Slice:** on a phone, the comms line moves from under the playfield to the top band (PRD 12.2, 13.2)
**Ends with:** the portrait and line sitting under the fleet score and status row, with Speech and
Missile alone in a slim strip at the bottom corners.

---

## What we set out to do

The first feedback from playtesters on phones: the comms line under the lane was hidden by their
fingers. On a phone you fly by dragging anywhere, and the Viper lives low in the lane, so the
thumbs spend the whole fight parked over that strip.

We looked at three layouts. In all three the comms line goes to the top. They differed on what
happens to the buttons:

- A. They stay under the lane, in a strip of their own.
- B. They float over the bottom corners of the lane.
- C. The line overlays the top of the lane instead, where the Raiders come in.

The owner chose A. It keeps the rule that the buttons never sit on the playfield, so the fleet stays
uncovered.

## What we built

- The comms slot is now the last row of the top band, with the same fixed height as before, so a
  longer line still wraps inside it and never resizes the lane.
- The bottom strip holds only Speech and Missile, one in each corner. It exists only on a touch
  screen. A narrow desktop window has no strip, so its lane runs to the bottom edge.
- During the Recovering pick the buttons still step aside. The strip keeps its height, so the lane
  does not jump. The Recovering line now plays in the top slot.

## What we measured

| Viewport | Lane before | Lane after |
|---|---|---|
| Pixel 7, 412 × 839 | 371 × 660 | 333 × 592 |
| Small phone, 375 × 667 | 274 × 488 | 236 × 420 |

The lane is about 10% smaller. The comms slot (82 px) is taller than what the bottom strip gave back
(90 → 68 px). We expected this when we chose A.

## What surprised us

- Nothing needed changing outside the layout. The lesson cards place themselves from the lane's own
  box, and the Training Run's phone flows still pass. We did not screenshot each lesson card again.

## What is still open

- Check on a real phone that the line reads at a glance up there, and that the smaller lane still
  feels fair.
- If the lane feels cramped, the easiest place to win room back is the comms slot. A 48 px portrait
  would return about 16 px.
