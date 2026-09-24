# 0051 — A hit you can feel

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 3, item 3.4 (hit feedback)
**Ends with:** a round that lands looks like it landed, without anything flashing or shaking.

---

## What we set out to do

Make hits feel like hits within the comfort rules: no camera shake, no flash, nothing that strobes.

## What we decided

**No hit-stop.** A short freeze on a kill is the classic trick, but here auto-fire kills something
about once a second with four to six targets up. Freezing each time would stutter the whole game and
steal seconds of real time a cycle. The feedback stays on the thing that was hit.

**Hits became facts.** The domain only reported kills. It now also reports a Raider hit, a Viper hit,
and a round on the resurrection ship, with whether the shield took it. Effects hang off those, and so
will the sounds in the next slice.

**Warm sparks, a small knock, a ripple.** Three-pixel sparks spray from where the round struck and fade
in 200 ms. The Raider's picture nudges two pixels up the lane and settles; its position in the rules
does not move. A round on the shield ripples the bubble in the shield's own colour. A heavy goes up in a
bigger burst. With reduced effects, one still spark marks the hit.

## What we measured

- Unit tests: 239 (three new: hit, kill, shield, and eject each report the right fact, never both).
- A burst of 80 screenshots mid-fight found the first sparks, at two pixels and 160 ms, barely there:
  one dot under a Raider that had just lost a pip. They went to three pixels and 200 ms.

## What surprised us

**Screenshots are a poor way to see a 160 ms effect.** Counting warm pixels across 80 frames found the
explosions first, because the explosion and the engine glow share the sparks' palette. The small counts
between them were the sparks.

## What is still open

Audio, the last item in Phase 3: the sound port, the cue table, ZzFX, and the mute control's return.
