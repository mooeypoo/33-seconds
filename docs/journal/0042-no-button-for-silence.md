# 0042 — No button for silence

**Date:** 2026-09-24
**Slice:** hide mute until there is sound
**Ends with:** no Sound on button on the title, the HUD, or pause.

---

## What we set out to do

The button said Sound on, and nothing in the game makes a sound. Phaser still boots with no audio.

## What we built

The button is unmounted. The title no longer says the game has sound. `MuteControl`, `setMuted`, and
the `muted` flag in player settings are unchanged, so the control can come back with the first sound.

## What we left out

No audio, and no change to the mute rules for the day sound exists.
