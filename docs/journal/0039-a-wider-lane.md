# 0039 — A wider lane

**Date:** 2026-09-23
**Slice:** give a wide window a wider playfield and slightly larger fighters
**Ends with:** a 324-wide desktop lane. The Viper and the Raiders are a quarter larger there. The fleet is not.

---

## What we set out to do

On a monitor the portrait column is short on height, so the canvas scale stays small and a
16-pixel Viper is about 28 screen pixels. Widen the desktop world, and grow the fighters
with their hitboxes. Leave the fleet, the shots, and the phone world alone.

## What is true now

A window wider than 800 pixels plays 324 × 480. A narrower window plays 270 × 480. The
choice is made when the run starts, so a resize mid-run does not swap the lane.

The same seed on two desktops is the same spawns and the same card offers. The same is
true of two phones. The two do not have to match each other. A shared result, when that
exists, carries the numbers from the run that finished. It does not re-simulate the seed.

## What we left out

The fleet drawings. One file per hull, at the small size, used on both screens. The
existing Viper and Raider files are shown a little larger on the desktop. That shrink is
not a whole number of pixels, so those two pictures are slightly uneven there. A redraw
would be the way to make them crisp, and it is not required to play.
