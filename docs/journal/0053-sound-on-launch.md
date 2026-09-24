# 0053 — Sound on Launch

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 3, item 3.5 (audio)
**Ends with:** a fight you can hear, a mute button you can find, and a tab that stays silent until you
press Launch.

---

## What we set out to do

The game had been silent on purpose. The rules for sound were written before the first sound existed
(PRD 14.1): nothing before the player's first gesture, a mute in words one tap away, and the choice
remembered. This slice brings in the sounds and holds the game to those rules.

Left out: music, separate music and effects volumes (the full settings screen), and the owner's real
sounds. Every id has a soft, low placeholder, marked as one, so the game works today and each sound
can be replaced on its own.

## What we decided

**Sounds are content.** `src/content/sounds.json` holds one ZzFX array per id, and `check:content`
rejects an unknown or doubled id, a missing one, a value that is not a number, more than 21 values,
and a volume over 1. The ZzFX Sound Designer prints arrays with holes and leading dots
(`[,,925,.04]`), which is not JSON, so an entry can also be that text pasted as a string. The owner
can copy from the designer and paste without editing anything.

**The rules live in the application layer, the noise in infrastructure.** `AudioDirector` decides
what plays: the event-to-sound table, a 50 ms gap per sound, three voices per sound and eight in all,
a small seeded pitch wobble on bursty sounds, mute, volume, and when sound is held. The ZzFX adapter
only turns an id into a buffer and plays it. So every rule is tested with a fake port, and swapping
the engine would keep them all.

**Auto-fire is silent.** It fires several times a second; any sound on it would bury everything
else. Hits that do not kill are silent too. The sparks already carry them.

**A hidden tab is not the same as pause.** The Recovering sheet ignores pause (the sheet already
waits for Apply), but a hidden tab must still go quiet. So the session tells sound about the tab
separately. And the 3-2-1 after Apply is not a pause for sound, so the Apply chime is not cut off by
the countdown it starts.

## What we measured

- Unit tests: 240 → 294, all passing (audio director, session sound, sound bank,
  settings).
- Guardrails: 81 sabotages, all caught. Fourteen are new, one per audio rule: the heavy kill's
  own sound, the gap, both voice caps, unlock, mute, the hidden tab, the spool call, pause, the Apply
  countdown, a corrupt stored volume, the loader's volume cap, a loud array, and a misspelled id.
- End-to-end: 55 passing on desktop and phone (6 new). One counts `AudioContext` constructions: zero
  after the title's other buttons, including Mute, and at least one after Launch.
- Bundle, gzipped: main chunk 435.3 → 439.4 KB. ZzFX is its own 1.1 KB chunk, loaded on Launch.

## What surprised us

**ZzFX makes an audio context the moment it is imported.** Its module has `audioContext: new
AudioContext` at the top level. A normal import would have created one on page load, breaking the
first rule before any code of ours ran. The adapter imports it dynamically inside the Launch
gesture, creates our own context synchronously (iOS insists), uses only ZzFX's sample builder, and
closes the spare context it made. The end-to-end context count is there so that a later "tidy"
static import fails a test instead of quietly waking the speakers.

**The first voice-limit test was wrong in an instructive way.** It fed frames 16 ms apart and was
surprised when the 50 ms gap swallowed them. The rule was fine; the test had to space frames the way
a real fight does.

**A loose parser, caught by its own test.** The first version accepted `"0.05"` (a string) inside a
JSON array, because the pasted-text path allowed number text everywhere. The test for "a string
value is rejected" failed, and the text path is now only for pasted text.

## What is still open

- The owner's own sounds, one id at a time, at `/tools/sound-test/` under `npm run dev`.
- A phone check: hear it on a real iPhone and Android, including the mute switch and a locked screen.
- Whether auto-fire gets a barely-there tick. It is one line in the table and one entry in the file.
