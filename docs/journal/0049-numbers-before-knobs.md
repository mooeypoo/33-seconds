# 0049 — Numbers before knobs

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 3, PR 3a (tier data and the balance simulator)
**Ends with:** the same game, whose difficulty now lives in a JSON file, and a report that says how
it plays before anyone retunes it.

---

## What we set out to do

The swarm ramp is the next change, and it will be tuned by feel unless there is something to tune
against. So first: move the tier numbers into data the owner can edit, and build the headless
harness ADR-0001 promised in its first week.

## What we built

- **`src/balance/tiers.json`**, one object per difficulty. The Director cap and the attack and
  strafe tokens became **ramps**, lists by cycle whose last value holds. Every value is checked on
  load and in `check:content`, and a bad file names all of its problems at once. Values unchanged.
- **`npm run sim`**: three bots (idle, hunter, guard) play 60 seeded runs per tier and print win
  rate, run length, the fleet's low point, Raiders on screen, and ejects. About 25 seconds.
- **Three property tests** in `npm test` go through the same harness: a seed replays the same run,
  the swarm never exceeds its cap, and an idle pilot never loses on Civilian Run (PRD 7.3). The last
  one fails when Civilian Run is given no repair, which is the point of it.
- A boundary rule: the harness may use the domain and the tier data, never the session or the
  overlay.

## What we measured

The baseline, before any retuning:

- A pilot who chases kills **wins every run in cycle 4, in 2.6 minutes.** The PRD's target is 6 to 8.
- That same pilot sees **0.6 Raiders on screen** on average.
- An idle pilot on Viper Pilot **loses 2% of runs**, although PRD 7.3's arithmetic says maximum damage
  loses in cycle 5. An idle Viper just does not soak maximum damage.
- 221 unit tests; 12 content checks.

## What surprised us

**The review's hunch was the loudest number.** "Two Raiders on screen" was a reading of the code.
The simulator says it is worse in play: kills make gaps, and downloads take six seconds to fill them,
so the average is under one.

**A new import made a cycle.** Giving the profile a default built from the domain's constants tied
the balance types, the fleet, and the views into a loop. The default moved to its own module, and the
types file imports nothing.

## What is still open

PR 3b: the ramp itself, with a floor so the sky stays at three to five Raiders. Two interpretations
wait for the owner: how the floor and the last wave behave, and the heavy Raider's numbers.
