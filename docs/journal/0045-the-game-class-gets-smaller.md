# 0045 — The Game class gets smaller

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 0, PR B (items 0.6 to 0.9)
**Ends with:** Phase 0 done. The same game, with every run on its own seed and the rules in
modules named after what they are about.

---

## What we set out to do

Finish the groundwork from the review before anything visible changes: split the simulation class,
take comms out of the session, check content at build time, and act on the seed decision.

## What we decided

**Seeds are for tests, not for players.** Before choosing, we priced keeping "same seed, same
scenario." It was broken three ways (card offers and spawn columns both depended on how you played,
and flak drew from the same stream), fixing it was a day or two, and after that every future random
feature would carry a fixed draw order. The only payoff was a daily challenge or a "try my run"
link that nobody had asked for yet. Randomness stays injected, so that feature can come back later
without touching the architecture.

**Keep the two gameplay streams.** Merging the scenario stream and the resurrection ship's
station-keeping stream would have been tidier. It would also have moved every seeded test's numbers
for no player benefit.

**A scene that runs long is not a content error.** The content schema says the check fails a scene
over 12 seconds; the newer PRD says the beats shrink so it still fits, and the code does that. The
check follows the PRD, and the schema is flagged for the owner.

## What we built

- **A fresh seed per Launch** through a `SeedSource` port: `crypto` in the browser, a fixed number
  in tests. Comms derive their own stream from it.
- **`Swarm`, `Munitions`, and `hits`.** The swarm and the download queue, the shot and missile
  pools, and hit resolution each live in their own module. `Game` keeps the order of a tick.
- **`CommsDirector`**: lines, scenes, cues, and the Six remark, out of `GameSession`.
- **`npm run check:content`**, in CI. It runs the game's own loaders over every file and names what
  they would drop, instead of the joke silently never playing.

## What we measured

- Every run was seed 1 before this slice, so the same kills gave the same spawns, cards, and jokes.
- `game.ts`: 1,164 lines before, 628 after. `GameSession.ts`: 432 before, 339 after.
- Unit tests: 205, all passing unchanged through the split. Content checks: 9, passing on the
  current files.
- `check:guardrails`: 59 of 59 caught (55 before, plus four content sabotages). Five anchors moved
  with the code.
- End-to-end: 41 passed, then 123 of 123 with every test run three times in parallel. Release bundle 428.1 KB gzipped (427.4 before).

## What surprised us

The split was mostly moving text, but the ids were the trap. Shots, missiles, and Raiders share one
id counter, and tie-breaks read it, so the new modules take an id allocator from `Game` instead of
counting on their own. A module with its own counter would have passed every test that does not
tie-break, and changed the ones that do.

**The pause-test fix from the last slice was not enough.** "Esc pauses" failed on a second full
run: the readout said 10 ticks twice, 300 ms apart, then 16. On a loaded machine the renderer's
frames, which refresh the readout, can be further apart than any wait we pick. The real problem was
that the debug line mixed an instant source (the phase, from Vue) with a lagging one (the ticks,
from the renderer). Now each snapshot records whether the session was frozen when it was taken, and
the tests wait for a frozen snapshot instead of for time to pass. The whole suite, run three times
over in one parallel run: 123 passed.

## What is still open

Phase 1, the quick UX wins. The scene-length line in the content schema.
