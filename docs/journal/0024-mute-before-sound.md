# 0024 — Mute before there is anything to mute

**Date:** 2026-09-22
**Slice:** M5's storage seam, before audio
**Ends with:** a labeled mute on title, HUD, and pause, and a drag hint that stays gone.

---

## What we set out to do

Section 14.1 has to be true before the first beep: the title says the game has sound, mute is
one tap away, the choice is remembered, and the game still works when storage is hostile.

Not in this slice: AudioPort, volumes, actual sound, abandon run, the full settings screen,
comms, JSON difficulty files, or a harder-return invite.

## What we built

- `StoragePort` with a localStorage adapter that never throws, and a memory adapter for tests
  and missing storage.
- `PlayerSettings` at `thirty-three:v1:settings`: muted, reducedEffects, dragHintSeen. Wrong
  versions, non-booleans, and junk become defaults. A failed write does not undo mute.
- Mute in words (Sound on / Muted) on the title, the HUD, and pause, 44 × 44. Reduced-effects
  on pause. The first drag on a phone is remembered.

## What we assumed

OS `prefers-reduced-motion` always reduces. The in-game toggle can only add reduction. Phaser
presenters are built once at boot, so a toggle mid-run (or on the title) applies after a
reload. Phaser still boots with `noAudio`.

## What surprised us

Mute had to exist as application state, not as an audio-engine flag, or the control would have
waited on the first sound. That is why it lives next to settings even while Phaser is silent.

## What we tested

Hostile parse (future version, truthy junk); mute without a working store; round-trip through
memory and localStorage; OS OR setting. Two sabotages: a future envelope is trusted, and
`Boolean("yes")` counts as mute.

## What is still open

1. **Soon:** JSON objects per difficulty (typed, validated) so hit / hull / Director / repair
   can move without a code change. Do this before a third tier.
2. **Later:** after a win, invite a return on a harder profile without making Civilian Run feel
   like practice.
3. **Abandon run** from pause (back to title).
4. AudioPort, the first sound, volumes.
5. Full settings screen (M6).
6. Retry-from-last-jump, epilogue.
7. Mid-cycle life pickups, with the bonus cards.
8. Straight-down fire, if bodyguarding still feels like a fast eject.
9. A quiet FTL border when 10 or 5 seconds remain.
10. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
    real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames, real `raptor`,
    real `imaginary_six`.
11. Ship path, panic, escape FTL, slow-mo.
12. Missile pickups, blast radius, Later cards, comms "who are you talking to".
