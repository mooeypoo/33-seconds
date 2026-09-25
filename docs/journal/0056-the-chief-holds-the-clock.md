# 0056 — The Chief holds the clock

**Date:** 2026-09-25
**Slice:** PRD decision 17 promoted: the Training Run (PRD 5.5)
**Ends with:** a Training Run button on the title, a simulator run where Tyrol stops the clock to
explain each thing the first time it happens, and a debrief with a grade instead of a score.

---

## What we set out to do

A tutorial that shows the mechanics in a fun way: how you win and lose, what the clock and fleet
health mean, how rounds reach the fleet, the partial repair, the eject, the cards. The owner's
calls, made in chat: a button players can press as often as they like, pushed to new players and
quieter after; the simulator as the frame, with no new art; Tyrol teaching and Starbuck flying and
showing off; the clock held while a tip is up, clearly, until the player acknowledges it; the whole
script editable as data; and a grade at the end, not a callsign, because the pilot is Starbuck.

Left out: a player callsign, difficulty levels, outlines on things in the playfield itself (only
HUD elements), and new sprites.

## What we built

- **No domain change.** The resurrection ship's arrive cycle, expose cycle, and hull were already
  `GameOptions`, so the Training Run is a preset in `src/balance/training.json` passed in at Launch.
- **A lesson director in the application layer.** It reads domain events and the view, marks a
  lesson due the first time its trigger happens, and hands the session a card when the moment is
  right. The session shows it the only way it knows how to stop the world: a pause, reason
  `lesson`. Got it, Esc, and P dismiss it; the next due lesson follows with the clock still held;
  then the ordinary 3-2-1.
- **Lessons over the pick sheet do not pause.** That sheet is never paused (PRD 13.3), so a lesson
  there only blocks the pick and the reroll until it is read.
- **The script is `src/content/training.json`**: 19 lessons and a debrief, all placeholder lines.
  `check:content` names any lesson the loader would drop and why.
- **The title** gains a Training Run box above Launch, framed in amber, until the first debrief;
  then it moves below Civilian Run. A new `trainingCompleted` flag in player settings, no version
  bump.
- **HUD outlines.** A lesson can name `clock`, `fleet`, `status`, or `objective`; one attribute on
  the root turns on a still amber outline on whichever copy of that element the layout shows.

## What we measured

A headless bot (fly under the nearest Raider, then under the ship, take the first card, read every
lesson) finished the Training Run on five seeds in 84 to 96 seconds of game time, over three
cycles. It saw every lesson, since it gets hit. With Raiders that never fire, the hull and eject
lessons never come up and the debrief lists them instead.

## What surprised us

- A kill, a hit on the Viper, and a fleet hit often land within one second. Without the 3-second
  gap after a resume, that was three pauses and three 3-2-1s in a row. With it, lessons that come
  due together show back to back while the clock is already held.
- A slow phone runs up to three ticks per frame. The first version checked for lessons once per
  frame, so a lesson could appear a couple of ticks after its moment. The session now checks after
  every tick; a test compares one-tick and three-tick frames and expects the same tick.
- Fleet Integrity is not a whole number, so the first repair lesson read "68% to 87.2%". It rounds
  now, like the fleet readout.
- Pause is an application concern, and that paid off: holding the clock for a lesson took no new
  mechanism at all.

## What is still open

- Real lines for every lesson and the grades (owner's content pass).
- Whether a 3-2-1 after every lesson feels slow over about a dozen lessons. Play it and decide.
- Whether a fight lesson should wait for the gap, or break in at once (the gap means a first-kill
  lesson arrives about 3 seconds after the kill).
- Outlines on things in the playfield (the ghost blip, the resurrection ship) would need the
  Phaser side; the words carry it for now.
