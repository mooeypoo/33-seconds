# 0034 — The Viper is a picture

**Date:** 2026-09-22
**Slice:** show the first sprites
**Ends with:** the Viper and the small explosion drawn from PNG files. Raiders are still rectangles.

---

## What we set out to do

Check the Viper frames and the six explosion frames, then put them on screen in place of the
placeholder shapes, before any more pictures are made.

## What we found

All ten files are 64×64 PNGs. The magenta background is already gone. The four Viper frames
are different pictures, and neutral and flicker stay close, which is what a brighter engine
should be.

They are not palette-clean. Edges are soft (partial transparency), and the colors sit near
the palette rather than on it. Explosion frames 4, 5, and 6 have no fully opaque pixels, so
they read faint. The game shows the files as they are, so that is visible.

The art notes now describe the Viper as an angular wedge, the Raider as an upside-down
crescent, and the explosion as one hero cell plus five painted from it. Heroes are square,
on magenta, and the engine glow is white-yellow.

## What we built

The Viper uses the four frames, shown at 16 world units. A hard sideways move picks a bank.
Climbing holds the brighter engines, so the picture does not blink. Hull pips stay above it.
A destroyed Raider plays the six frames in about 0.7 seconds. Reduced effects holds the
widest cell instead of stepping through them. Pause freezes the playback.

## What is still open

Snapping these files to the palette and to hard pixels, if the soft edges bother you on a
phone. Then the Raider, the shots, and the rest of the first pack. Sound and the fairness
numbers still wait.
