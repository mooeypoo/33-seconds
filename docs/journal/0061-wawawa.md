# 0061 — Wawawa

**Date:** 2026-09-27
**Slice:** experimental character voices: indistinct radio chatter per speaker, made from ZzFX
syllables, heard only on the sound test page (PRD 14.3)
**Ends with:** a Voices panel on `/tools/sound-test/` where each of the nine speakers babbles in
their own voice, through a radio band, and a `voices.json` for the owner to tune.

---

## What we set out to do

The comms line has a portrait and text, but everyone sounds the same: silent. We talked through
recorded voice acting first and dropped it. The script changes all the time, a line can be cut off
at any moment, and an impression of an actor is still a likeness. What the owner wanted was smaller:
the "blah blah wawawa" of a character talking on the radio. The sound doesn't change between
lines, only between characters.

Left out on purpose: anything in a run. How long a voice talks, whether the spool countdown talks,
ducking, and a Voices volume all wait until the voices have been heard.

## What we decided

- **Syllables, not one long sound.** ZzFX makes single sounds. A buzzy saw tone through ZzFX's
  resonant low-pass filter sounds surprisingly like a vowel, and the cutoff picks which one (about
  -500 for "oo" up to -2500 for "ee"). A voice is two to four of those syllables, strung by our own
  code.
- **Irregularity is the whole trick.** Random order, a pitch that wanders a few semitones, gaps
  stretched or squeezed by up to 30%, a longer pause every few syllables, and a bend on the last
  syllable of a phrase: down for a statement, up for Baltar's panic and Six's mystery. Without
  these, ZzFX's `repeatTime` and `tremolo` already make a syllable train from a single array, but it
  sounds like a machine.
- **Seeded, and ZzFX's own wobble off.** The babbler takes a random stream and a sample builder,
  so it is pure and testable and never loads ZzFX (which opens an AudioContext on import). ZzFX's
  `randomness` slot calls `Math.random` inside, so the babbler sets it to 0 and does its own pitch
  wander.
- **A stream behaves like a recording.** It is a fixed buffer, cut at any length with a fade. If
  the owner later records a real voice for someone, it can take that voice's place.
- **The radio is data.** The band (300–3400 Hz) and the drive live in `voices.json`, and the page
  has a checkbox to hear the voices dry. The saturation curve is scaled so a typical peak comes out
  at the same level, so turning the drive up changes the texture, not the loudness.
- **The page keeps its own small audio chain** instead of changing `AudioPort`. Nothing here
  reaches a run, and the port should change once, when we know what the game needs.

## What we measured

Each voice rendered for 3 s with the real ZzFX (seed 7), against a few game sounds, as peak and
RMS of the voiced samples:

| | Peak | RMS |
|---|---|---|
| First pass, voices | 0.25–0.34 | 0.067–0.101 |
| Game effects (kills, hits, missile) | 0.09–0.31 | 0.033–0.089 |
| After scaling voices down 30% | 0.18–0.24 | 0.047–0.071 |
| Six (soft on purpose) | 0.10 | 0.045 |

Chatter should sit under the fight, so the voices were scaled down until they sat level with or
under the effects. This number was only measured, not heard. Only a listen can say whether a level
is right.

## What surprised us

- **Every test caught its break.** We broke eight things on purpose: ZzFX's wobble left on, no
  phrase-end bend, no phrase gap, a phrase one syllable short, a wider jitter, no cut at the end, the
  default release ignored in the syllable length, and duplicate speakers allowed. Each break failed
  a test. The phrase test first missed the off-by-one, because it only checked "within range," so it
  now also checks that both ends of the range happen.
- **An empty ZzFX slot is not zero.** An empty release slot means ZzFX's default of 0.1 s, so the
  syllable length check has to count defaults, or a pasted array could slip past it.

## What is still open

- The owner's listen and tuning pass, starting with Six and whether the radio is too crackly.
- Before a voice plays in a run: the speaking window, critical lines, ducking, a Voices volume, and
  a start/stop verb on `AudioPort` (ADR-0001 D12).
- In a run, the plan from the chat is to render 2–3 streams per voice at Launch from the cosmetic
  random stream, and play each line from a random point in one of them. The page makes a fresh
  stream per press instead, because that is easier to judge while tuning.
