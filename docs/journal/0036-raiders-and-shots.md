# 0036 — Raiders and shots

**Date:** 2026-09-23
**Slice:** put the Raider and the three shots on screen
**Ends with:** those pictures in place of the rectangles. The fleet is still shapes.

---

## What we set out to do

Show the Raider frames and the three bullet files. Leave the fleet, the missiles, and the
rest of the pack alone.

## What we found

The Raider files are 48×48 with a clear background. The red eye sits about 3 pixels left
of center, then 3 pixels right, which is close to the 4-pixel shift the shrink needs.

Player and aimed shots are 12×20, shown at 3×5. The first stray file was that same canvas.
The replacement is 12×28, shown at 3×7, so the longer trail is a cue besides the orange.

The shot pictures point up for the Viper and down for the Raiders. A round that is not
flying straight stays upright. Rotating a 3×5 picture off the pixel grid smears it, and
the path still shows the direction.

## What we built

An armed Raider steps center, left, center, right, two pictures a second. That stays under
the flash limit, and pause freezes it with the rest of the animation clock. An unarmed
Raider, and reduced effects, hold the center frame. Hull pips stay above the picture.

## What is still open

The fleet, the missile, and the rest of the first pack. Sound and the fairness numbers
still wait.
