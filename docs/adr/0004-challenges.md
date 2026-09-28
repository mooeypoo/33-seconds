# ADR-0004: Challenges, the weekly challenge, and how they are shared

**Status:** Accepted (2026-09-28). Being built in four slices on one branch; each slice ticks its
box below when it lands.
**Date:** 2026-09-28
**Deciders:** Moriel (owner)
**Related:** [PRD](../PRD.md) 5.1, 5.4, 11, 17, 19; [ADR-0001](0001-architecture.md) D3 and D9;
[ADR-0003: community server (deferred)](0003-community-server-deferred.md)

---

## Context

The owner wants more communal play without a server (ADR-0003 is deferred): ways to challenge
yourself beyond the normal run, a challenge that changes every week, and results worth sharing
with a funny verdict. Owner decisions on 2026-09-28:

- The normal game becomes **Story mode**. The title gets a **Challenges** sheet beside it.
- Set challenges to start: a heavier **swarm**, **Tyrol overwhelmed** (less repair at each jump),
  **endless** (how many jumps can the fleet hold; revised when built, see below), and a **slow FTL** (66-second cycles, with a funny reason, such as Baltar's upgrade
  working better but slower).
- A **weekly challenge**, combined automatically from a pool. Hand-written weeks can come later.
- A shared challenge result offers **Beat this**, which plays the same challenge and compares.

Three existing rules shape the design:

- **The 33-second clock** is `[Core]` (PRD 5.1), and `jumpCycle.ts` calls it "not tunable".
- **Tiers change numbers, never rules**, and the tier profile is at 11 of its 12 knobs
  (ADR-0001 D9).
- **No shared scenario** (PRD decision 9, ADR-0001 D3): every run draws a fresh seed.

## Decision

### A challenge is a preset: a base tier, number overrides, and at most a few mutators

`src/balance/challenges.json` holds one entry per set challenge, checked on load and by
`check:content`:

- `tier`: the base tier (Viper Pilot unless there is a reason).
- `profile`: fields of `CycleProfile` to replace (ramps, fleet cap, repair, heavy numbers). The
  result is a whole profile checked by the same `parseTierProfile` as `tiers.json`. **This spends
  no knob**: it moves numbers that already exist.
- `ship` (not built yet; add it when a challenge needs it): the resurrection ship's run options
  that `GameOptions` already takes (arrive cycle, shield cycle, hit points), the way the Training
  Run preset does.
- `mutators`: rule variants, by id. A mutator is the only way a challenge changes a rule.

Names, blurbs, and verdict lines are content, in `src/content/challenges.json`. The application
turns a challenge into `GameOptions` and launches it through the same path as Story mode and the
Training Run.

### Mutators are run options, not feature flags

A mutator is a `GameOptions` field the domain reads at construction, like
`resurrectionShipHitPoints`: a finished rule variant chosen for a whole run, tested like any rule.
It is not a feature flag (unfinished code behind a switch), so the "no feature flags in the domain"
rule holds. Each one is typed as narrowly as it can be. Two to start:

- **`endless`** (built 2026-09-28): `GameOptions.resurrectionShip: false`. No resurrection ship
  ever arrives, so every kill downloads, the run cannot be won, and *Gaius' Lab* is never dealt.
  The fleet falling ends the run as **held**, a third outcome, scored by `scoreEndlessRun` (jumps
  held, kills, ejects). `mutatorOptions` in `balance/challenges.ts` is the one place a mutator's
  name becomes a run option, so the application and the sim cannot disagree.
  - *Revised from the first sketch* (the ship jumping away at low hull): the owner chose no ship,
    with the swarm flat after cycle 8.
  - *Why the repair falls:* with a flat swarm and a steady repair share, the fleet has a balance
    point. If it takes more per cycle than the jump gives back it falls within a few cycles; if
    less, it never falls. `sim` showed exactly that (fallen by cycle 4 or 5, or alive at 60). So
    `fleetRepairOfMissing` became a ramp, like the swarm numbers: a tier holds one value, and the
    Endless profile lists a falling one. This spends no knob, the field already existed. The HUD
    view model exposes the repair as a percent only when it changes by cycle.
- **`slow-ftl`**: the combat clock is **66 seconds**. Arriving stays 5 seconds and the spool stays
  the last 8 (58 to 66), so every tell and comms call keeps its meaning. The option is typed
  `33 | 66`, not a number, so the cycle length is still not a tuning knob.

### The 33-second exception

**Story mode and the Training Run are always 33 seconds.** Only a challenge that names the
`slow-ftl` mutator changes the clock, and the HUD says so. The per-cycle damage cap and the repair
are per cycle, so a 66-second cycle needs its own fleet numbers in its challenge entry; `sim`
checks them.

### The weekly challenge shares rules, not spawns

- The week is the ISO week (`2026-W40`), read from the device clock in the application (never in
  the domain) and passed in, so tests fix it.
- A pure function turns the week key and the pool (`weekly` in `challenges.json`) into a
  challenge: one swarm variant and one fleet variant (mutators may join later), chosen with a
  seeded hash of the week key. It is named "Week 40", short enough for the end screen's kicker and
  the share image; what it changes is a list of the parts' names and lines, from content.
- Everyone gets the same rules that week, but every run still draws a fresh seed. Decision 9
  stands: no shared scenario, and no promise about draw order.
- A device with a wrong clock plays another week's rules. That only affects that player.
- If the pool changes in a release, a week's rules change with it. The share link carries the game
  version, and an old result is marked as old, as it is today.

### Sharing: link format 2, a verdict, and Beat this

- The share payload moves to `v=2` and adds the challenge key (`x`: a set challenge id, or
  `weekly:2026-W40`) and a verdict id (`j`), and allows the outcome `held` (only with a challenge,
  and no ship hurt). Story mode writes no challenge key. **Reading `v=1`
  stays supported**; it is a Story mode result.
- **A verdict** is a line judging the run, drawn on the cosmetic stream from the challenge's pool,
  by score band (for Endless the score is mostly jumps held). Its id travels in the link like the headline. A
  verdict that was cut falls back to the pool's first line.
- **Beat this** on a shared challenge result starts that challenge. The rival's result is held in
  memory for that run only, and the end screen compares the two when the challenge key matches.
  Nothing is stored.
- The share image shows the challenge's name and the verdict.

## Slices

Each slice ends playable, with typecheck, lint, tests, `check:arch`, and `check:content` green,
`sim` covering the new challenges, and a journal entry.

1. [x] **Framework and two number-only challenges** (*Swarm*, *Tyrol overwhelmed*): the preset,
   the title's Story mode and Challenges split, `v=2` links, verdicts, Beat this. (2026-09-28:
   `balance/challenges.ts` merges and checks the preset, `application/challenges.ts` joins it to
   the words and owns verdicts and the rival comparison, `GameSession.startChallenge` launches it.
   `challenges.json`'s numbers joined the balance fingerprint.)
2. [x] **Weekly challenge.** (2026-09-28: `application/isoWeek.ts` for the UTC ISO week;
   `parseWeeklyPool` checks every pair's merged profile on load; `weeklyPair` picks from the key's
   FNV-1a seed. A swarm variant may set only swarm and heavy fields and a fleet variant only the cap
   and repair, so a pair never sets a field twice. The pool's numbers joined the balance
   fingerprint. `npm run sim` reports every pair against the hunter bot.)
3. [x] **Endless** (`endless` mutator). The score changes, so the game version is bumped.
   (2026-09-28: no ship, a falling repair ramp, the `held` outcome and headlines, `jumpHeld` in
   `scoring.json`, the `Repair N%` status chip; version 0.2.0. The sim runs Endless rows to 40
   cycles: median 10 to 12 jumps.)
4. [ ] **Slow FTL** (`slow-ftl` mutator, 66 seconds).

## Not doing

- Any server (ADR-0003), local best scores per challenge (possible later through the storage port),
  hand-written weekly pools, new cards, traits, or a shared scenario.

## Consequences

- **Easier:** a new number-only challenge is a JSON entry and its content lines. `sim` reports it.
- **Harder:** each mutator is real domain code with its own tests, and every mutator multiplies the
  combinations the weekly pool can produce, so the pool lists only combinations `sim` has checked.
- **Watch:** challenges must not become a back door for tier knobs. A number that only a challenge
  needs goes in the challenge entry, not in `CycleProfile`.
