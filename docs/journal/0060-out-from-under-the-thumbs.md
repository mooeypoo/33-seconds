# 0060 — Out from under the thumbs

**Date:** 2026-09-27
**Slice:** on a phone, the comms line moves from under the playfield to the top band, and the world
widens to fill the lane (PRD 12.2, 13.2, 14)
**Ends with:** the portrait and line sitting under the fleet score and status row, Speech and
Missile alone in a slim strip at the bottom corners, and a lane that fills the width of most phones.

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
- **The world fits the lane.** With comms on top, the lane was squatter than 9:16, and the 270-wide
  world left empty bands at its sides. Now, at Launch, the overlay lays out the run's bands for one
  frame before anything is painted, measures the lane, and picks a world width to match: at least
  the phone's 270, at most the desktop's 324, which are both widths the game has been played at.
  The run keeps that width.

## What we measured

| Viewport | Lane before | Lane after |
|---|---|---|
| Pixel 7, 412 × 839 | 371 × 660 | 333 × 592 |
| Small phone, 375 × 667 | 274 × 488 | 236 × 420 |

The lane is about 10% shorter. The comms slot (82 px) is taller than what the bottom strip gave back
(90 → 68 px). We expected this when we chose A. Fitting the world to the lane then won the width
back:

| Viewport | World | Lane on screen |
|---|---|---|
| Pixel 7, 412 × 839 | 324 × 480 (capped) | 399 × 592 |
| Tall phone, 360 × 800 | 304 × 480 | 350 × 553 |
| Small phone, 375 × 667 | 324 × 480 (capped) | 283 × 420 |

The small phone would need a world about 428 wide to fill its width. That is well past anything
balanced, so it keeps narrow bands.

## What surprised us

- **Phaser kept the old shape.** The canvas had the right internal size, but it was still drawn
  9:16. `scale.resize` keeps the aspect ratio the game started with. `setGameSize` updates it. The
  desktop never showed it. Our guess is that its window resize event landed after the resize, but
  we did not dig further.
- **The fleet stayed where the title put it.** On a phone the title's world is 270 wide, and the
  fleet presenter placed each ship once, when it first saw it. The new, wider run reused the same
  ship ids, so the ships bunched to the left while the domain had them spread out. The presenter
  now places them every frame. Phaser rendering has no unit tests (ADR-0001 D13), so a screenshot
  was the check.
- The lesson cards place themselves from the lane's own box, and the Training Run's phone flows
  still pass. We did not screenshot each lesson card again.

## What is still open

- Check on a real phone that the line reads at a glance up there, and that the smaller lane still
  feels fair.
- If the lane feels cramped, the easiest place to win room back is the comms slot. A 48 px portrait
  would return about 16 px.
- Small phones could take a world wider than 324, but only after `npm run sim` says the balance
  holds there.
- If the status row wraps to a second line during a run, the lane gets shorter than the one
  measured at Launch, and Phaser only refits on a window resize. This was already true before this
  slice, and it is worth a look on a real phone late in a run.
