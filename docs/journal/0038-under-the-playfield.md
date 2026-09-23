# 0038 — Under the playfield

**Date:** 2026-09-23
**Slice:** move the dialogue under the game, and pause for About
**Ends with:** a fixed strip under the playfield. Mute, Pause, and About stay above it.

---

## What we set out to do

The portrait and the line were in the top band. A longer line made that band taller, and
the playfield jumped to fit. Move the dialogue under the playfield and give the strip a
fixed height, so the text wraps inside it.

Mute stays above. Pause is a word, next to Mute. About is the same kind of button. Both
pause. About opens how to play and what the game is, instead of the pause menu. Resume
on that sheet returns to the run.

## What we revisited

On a phone the height-derived column was a thin strip, and Missile and Speech were pinned
to the screen bottom, so they showed beside the dialogue. The column is the screen width
there. Those two buttons sit on the playfield corners, above the strip. When the top band
cannot hold Sound, Pause, and About, they fold under a Settings gear.

## What we left out

The fleet percentage stays above, with its pips. Putting it at the end of the dialogue
strip, and showing the same portrait file at about 128 CSS pixels in the side margins,
are still the later pass in PRD 12.6.
