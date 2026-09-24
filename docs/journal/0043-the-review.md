# 0043 — The review

**Date:** 2026-09-24
**Slice:** a full review, and a roadmap instead of code
**Ends with:** ADR-0002, a gameplay review, a UI and UX review, and a redraw list. No code changed.

---

## What we set out to do

Stop adding features for a day and look at the whole thing: the code as a stranger would, the game
as a player would, and the screen as someone who opened the link on a laptop.

## What we measured

- All gates green: typecheck, lint, 200 tests in under a second, no boundary violations.
- The release build is **427 KB gzipped**. The ADR's budget is 300 KB. The tailored Phaser build
  that was supposed to close the gap was never done.
- On a 1440 × 900 window the run column is about **440 px wide**. Roughly 70% of the screen is black.
- An idle Viper Pilot lost **9%** of the fleet in the first 9 seconds and **29%** by the spool.

## What surprised us

- **Every run is seed 1.** The ADR spends a whole decision on seeded, separated random streams so
  a daily seed could be fair, and nothing at runtime ever passes a seed. Players get the same
  spawn columns, the same card offers, and the same jokes for the same kills. It raised a better
  question than "which seed": does the game want seeds at all? ADR-0002 D1 proposes not.
- **The colour tells had a text half nobody could see.** `loop` / `offline`, `bays` / `sealed`,
  `ejected`: the PRD calls them live, and they are, inside the debug readout that a release build
  hides. Every screenshot from development showed them, which is why nobody noticed.
- **A card's effect was invisible.** The ghost bar measures itself against the base 6-second
  download, so with *Your Call Is Important to Us* it sits empty for the first two seconds and only
  then starts filling. The card's longer wait never shows as a longer bar. The presenter read a domain constant instead of the view.
- **The fight is two Raiders.** Forty-two slices of careful rules, and the Director cap never moved
  off its first-slice value of 2.

## What we decided

The owner's answers are in ADR-0002: a middle-path swarm, the countdown out of the playfield, native
sprite sizes, a score and run summary, a capped heavy Raider, and the pixel font and ZzFX approved.
Architecture first (Phase 0), then quick UX wins, then the layout, then fun, then art.

## What is still open

The seed decision (ADR-0002 D1), and the brainstorm lists in both reviews.
