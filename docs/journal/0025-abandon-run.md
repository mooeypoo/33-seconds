# 0025 — Abandon run

**Date:** 2026-09-22
**Slice:** a way off a paused run
**Ends with:** Abandon run on the pause menu, back at the title, next Launch clean.

---

## What we set out to do

A paused run needed a way back to the title that discards it. Win and lose already do that.
Retry-from-last-jump stays a lose-screen idea.

Not in this slice: a confirm step, retry-from-last-jump, JSON difficulty files, audio, or comms.

## What we built

- `abandonRun` only while paused. The resume countdown ignores it. A running game ignores it,
  so it is not a skip.
- The pause menu button says Abandon run. The next Launch builds a new game. Held input is cleared.
  Queued Recovering events are dropped.

## What we assumed

One tap, no confirm. Resume stays the primary button. A second "are you sure" would be another
menu with no timer, and the label already says the run is discarded.

## What we tested

Ignored while running; discarded from pause, with the stick cleared and the next Launch at tick 0;
ignored during the countdown. One sabotage: abandon leaves the paused run in place. Playwright:
the button is at least 44 px, the title comes back, and the next Launch's tick count starts over.

## What is still open

1. **Soon:** JSON objects per difficulty (typed, validated) so hit / hull / Director / repair
   can move without a code change. Do this before a third tier.
2. **Soon:** share a finished run. A link back to the site shows that run's points and details
   graphically and offers another game. A shareable image can go with it. Encode the result in
   the link. Do not add a server for this unless it gets the leaderboard design note first.
3. **Later:** after a win, invite a return on a harder profile without making Civilian Run feel
   like practice.
4. Comms overlay, placeholder portraits, banter from JSON.
5. AudioPort, the first sound, volumes.
6. Full settings screen (M6).
7. Retry-from-last-jump, epilogue.
8. Mid-cycle life pickups, with the bonus cards.
9. Straight-down fire, if bodyguarding still feels like a fast eject.
10. A quiet FTL border when 10 or 5 seconds remain.
11. Graphics: dive tell, grey leftover ghosts, fleet idle, missile sprite, Speech portrait, card art,
    real `pilot_eject`, Spoilers plus, `flak_burst`, real hangar door frames, real `raptor`,
    real `imaginary_six`.
12. Ship path, panic, escape FTL, slow-mo.
13. Missile pickups, blast radius, Later cards, comms "who are you talking to".
