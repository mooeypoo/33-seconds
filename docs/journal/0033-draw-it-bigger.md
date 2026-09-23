# 0033 — Draw it bigger

**Date:** 2026-09-22
**Slice:** the first picture pass, still in progress
**Ends with:** a size and a frame count for the pictures, and still no sprites in the game.

---

## What we set out to do

Give the picture pass a shape the owner can draw against. The game still shows rectangles.

## What we decided

The Viper is an original shallow crescent, wingtips hooked slightly forward. The prompt
for that hero came back usable. The prompt for the Raider's eye came back as a big
painted eye, so the eye will be a few red pixels placed on the hull by hand.

The sweep is three frames: center, left, right. A slit is optional and is not part of
the movement.

The file is drawn at 4× the size the game shows. A Raider is 48 × 48, shown at 12 × 12.
A Viper is 64 × 64, shown at 16 × 16. The playfield is still one 270 × 480 picture, so
the extra pixels are for drawing. The eye moves 4 pixels in the big picture, which is
1 pixel after the nearest-neighbor shrink. A smaller nudge disappears.

The two prompts are saved in `docs/art/GENERATION-NOTES.md`.

## What is still open

The pictures. Once a hero and its frames are palette PNGs at those sizes, the game can
show them. Sound and the fairness numbers still wait until after that.
