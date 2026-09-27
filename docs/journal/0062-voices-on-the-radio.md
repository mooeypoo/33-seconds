# 0062 — Voices on the radio

**Date:** 2026-09-27
**Slice:** character voices in a run, behind a pause-menu toggle that is off by default (PRD 14.3),
plus two tuning passes on the placeholders and a fix for explosions nobody could hear
**Ends with:** **Character voices on** in the pause menu, and each non-critical comms line saying
its first second or two in its speaker's radio chatter.

---

## What we set out to do

Journal 0061 left the voices on the sound test page. The owner wanted to hear them during real
play without changing anyone else's game, so they come in behind a toggle, like reduced effects
and the readable font, and the toggle starts off.

The owner decided three things before we started:

- **Critical lines stay silent.** The spool countdown lands on the same moments as the spool
  beeps, and the beeps matter more.
- The label is **Character voices on / off**.
- **The portrait's mouth keeps its own timing.** It does not have to follow the voice.

Left out: ducking the effects under a voice, a separate Voices volume, a toggle on the title
screen, and making voices the default.

## What we decided

- **A voice talks for part of its line, not all of it.** A line stays up 4–8 s, and chatter for
  that long would wear thin. A line now talks for `0.6 s + 0.04 s × characters`, kept
  between 0.8 and 2.5 s, then fades. A replaced or cleared line cuts its voice with a 50 ms fade,
  so there is one voice at a time, like the strip.
- **The voice follows the strip the player sees.** The session hands the audio director the
  published comms line. A new line object is a new line, so the spool countdown saying the same
  words again still counts as new, and the same line published twice does not talk twice.
  `CommsLine` now carries the speaker's id and whether it is critical, since the strip only had a
  display name.
- **Never a surprise.** No voice starts before Launch, into a pause, into a hidden tab, or while
  muted. Mute and turning voices off cut a voice, and unmuting does not bring the rest of it back
  (PRD 14.1). Pause needed no new code: suspending the audio context freezes a voice mid-word, like
  every sound.
- **The voices get their own random stream.** Each line's stream seed comes from a voices-only
  stream, so turning voices on or off never changes the effects' pitch wobble. A test pins that.
- **One audio path.** The radio chain moved from the sound test page into the adapter, and the
  page now plays voices through the game's adapter, so what you tune there is what plays in a run.

## What we measured

A fresh stream is rendered on the frame its line appears, so it has to fit inside a frame. The
longest window (2.5 s) was timed in Node on a desktop, 450 renders across all nine voices:

| Approach | Median | p95 |
|---|---|---|
| Synthesize every syllable with ZzFX (0061's babbler) | 20.6 ms | 28.6 ms |
| Synthesize each syllable once per stream, resample for pitch | 4.6 ms | 6.6 ms |
| Also cache the syllables for the run | 0.54 ms | 0.65 ms |

The first approach was more than a frame (16.7 ms) on a desktop, so it would have hitched on
every line on a phone. Now each of a voice's syllables is synthesized once at the voice's pitch,
and every pitch after that reads the same samples faster or slower, the way a sampler does. A
higher syllable comes out a little shorter, which reads as natural in speech. The seeding, pitch
range, phrase bends, and gaps all behave as before.

In the real game, 20 seconds of play with voices on made three voices (2.0, 2.0, and 2.48 s). The
setting survived a reload, and there were no console errors. The bundle grew by 3.8 KB gzipped.

## Along the way: tuning by measurement

The owner tuned by ear, and twice the problem turned out not to be the one it sounded like.

- **Tigh was "too low and barely heard"**, but his overall level after the radio was normal. His
  vowel filters cut almost everything above 1 kHz, and the radio cuts everything under 300 Hz, so
  what was left was a muffled band. In the 1–4 kHz presence band, where hearing is most sensitive,
  he had a third of anyone else's level (0.0043 against 0.013–0.016). Brighter vowels, slower and
  longer syllables, and a little less rasp brought him to 0.0113.
- **Six's breaths read as huffing.** Removing them also took away most of her high end, so raising
  her volume alone did not make her easier to hear. ZzFX's shape curve at 0.5 fattens her triangle
  tone toward a square, which adds overtones without the buzz of a saw.
- **Four explosions made no sound on a laptop.** `raider_destroyed`, `heavy_destroyed`,
  `ship_destroyed`, and `ship_arrived` were pure sine waves at 60–140 Hz, with 1–8% of their
  energy above 250 Hz. Small speakers barely play that range. They now use a tan wave (ZzFX shape
  3) at the same pitch, with light bitCrush and a low-pass filter, and their energy above 250 Hz
  went from 0.0005–0.0037 to 0.025–0.051.

## What surprised us

- **Every break but one failed a test.** We broke ten things in the voice wiring, including
  voicing critical lines, defaulting to on, treating equal text as the same line, talking into a
  pause, and sharing the effects' random stream. Each failed a test. In the resampler, removing
  the end-of-buffer guard did not fail anything: a typed array silently ignores writes past its
  end, so that guard only saves work.
- **Our own mutation script wrote a file.** A mistyped helper passed a label to `sed` as its
  script, and sed's `w` command wrote a file named after the rest of the label. We noticed it as an
  untracked file and deleted it. The lesson: check that a deliberate break actually changed the
  code before trusting a run where the tests still pass.

## What we revisited

- **Voices were as loud as the effects** (after the radio, 0.028–0.040 RMS, against 0.03–0.09 for
  the effects). The owner wanted them a lot quieter. Every voice now passes through one shared
  level, 0.4, about 8 dB down, which puts them at roughly 0.011–0.016. It is one number in
  `voices.json`, so the balance tuned between Tigh, Six, and the rest stays as it was.

## What is still open

- Play with voices on, on a real phone: do they add character or grate after a few cycles?
- Ducking the effects under a voice, and a separate Voices volume, if the mix needs them.
- Whether voices become the default, and whether the title screen should mention them.
