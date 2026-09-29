# 0064 — How long can you hold?

**Date:** 2026-09-28
**Slice:** challenges, part 3 of 4 (PRD 11.1, ADR-0004)
**Ends with:** an **Endless** challenge with no resurrection ship, a jump repair that falls every
jump, a third ending (**Fleet held**) scored by the jumps the fleet made, and game version 0.2.0.

---

## What we set out to do

The first sketch of Endless kept the resurrection ship and had it jump away at low hull. When the
slice came up, the owner described something simpler and, honestly, better suited to the question
the mode asks: no resurrection ship at all, the normal number of Raiders, and one question, *how
many cycles would you survive?* Asked about the swarm, the owner chose to keep it flat after cycle 8
rather than let it climb.

## What we built first, and why it did not work

The rule itself was small. `GameOptions.resurrectionShip: false` skips the ship's arrival. The
domain already did the rest: with no ship, every kill downloads (the loop is "on" while no ship is
destroyed), and the win needs a destroyed ship, so there is no win. *Gaius' Lab* had to be kept off
the table, because there is no shield for it to drop.

Then the numbers. A first guess at a forgiving fleet (a 35-point cap, 50% repair) sent every bot
to the 40-cycle limit. Harsher fleets did something stranger:

| Fleet (cap, repair) | Idle | Hunter | Guard |
|---|---|---|---|
| 45, 0% | 4 | 4 | 3 |
| 45, 15% | 5 | 4, or all 60 in 7% of runs | 4 |
| 45, 25% | 6 | 5, or all 60 in 20% | 4 |

(Median cycles reached, 30 runs, up to 60 cycles.) Runs ended by cycle 4 or 5, or never. Nothing in
between.

That is arithmetic, not luck. Each jump mends a share *r* of what is missing, and a cycle at the cap
takes *c*. The fleet settles where the two balance, at 100 − (1 − *r*)·*c*/*r*, and it can only
fall if that balance point sits below one cycle's damage, which works out to *c* ≥ 100·*r*. With a
flat swarm the damage per cycle stops growing, so a run either crosses that line early or never
does. A better player does not last *longer*; they last *forever*.

## What we decided

The owner had three ways out: let Tyrol tire (the repair falls every jump), let the swarm climb
after all, or keep it flat and call a fixed number of jumps a win. They chose **Tyrol tires**: the
Raiders stay at Viper Pilot's numbers, and the fleet's recovery is what runs out.

- **Repair became a ramp.** `fleetRepairOfMissing` is a list by cycle now, like the swarm numbers,
  with the last value holding. A tier still writes one number, and the schema turns it into a
  one-value list, so `tiers.json` did not change. The jump uses the share of the cycle that just
  ended. No knob was added: the field already existed.
- **The Endless fleet:** a 40-point cap, and repair of 60% after cycle 1, 4 points less after each
  jump, nothing from cycle 16. It starts kinder than Viper Pilot (40%) and ends at nothing.
- **The player can see it.** The HUD view model exposes the repair as a percent only when it
  changes by cycle, so Story mode's HUD is untouched. In Endless the status row says `Repair 60%`,
  and marks it from 20% down.
- **A third outcome, `held`.** Losing is the only way an Endless run ends, so calling it "Fleet
  lost" would be a lie about a good run. `held` gets its own headlines (with `{jumps}`), its own
  kicker ("Fleet held"), the win colours, and stats that make sense without a ship: jumps held,
  Raiders destroyed, ejects. A share link may carry `held` only with a challenge and no ship damage.
- **Its own score.** `scoreEndlessRun`: 100 a jump held (`jumpHeld`), plus kills, less ejects. The
  Story formula would have buried every Endless run: it charges 2 points for every percent of fleet
  damage over the run, and an Endless fleet takes several hundred percent by the time it falls.
- **Version 0.2.0,** because `scoring.json` changed. Story mode scores did not move, but a result
  from before this can be told apart.

## What we measured

`SIM_RUNS=30`, curves tried before choosing (median cycles reached; up to 60):

| Cap, repair start, drop per jump | Idle | Hunter | Guard |
|---|---|---|---|
| 45, 50%, 3 | 9 | 9.5 (17% reach 60) | 7 |
| 45, 45%, 2.5 | 8 | 7 (13%) | 6 |
| 40, 50%, 3 | 9 | 12.5 (10%) | 9 |
| **40, 60%, 4 (shipped)** | **10** | **13 (10%)** | **10** |
| 35, 50%, 2.5 | 12 | 14 (20%) | 12.5 |

The full report at 60 runs, up to 40 cycles, for the shipped curve: idle 10, hunter 12, guard 10
jumps; nobody falls before cycle 9; hunter scores a median of about 2,800, idle about 340. About
7 minutes a run.

## What surprised us

- **Two tests failed on a busy machine.** Two card-dealing tests (one old, one this slice's copy of
  it) ran over Vitest's 5-second limit while a game was running in the background. The old one
  failed the same way on the last commit, measured in a throwaway worktree, so it was load, not this
  change. Still, a test that close to its limit is a flaky test waiting to happen; the new one now
  checks 30 seeds instead of 80, and still fails when the rule is removed.
- **"Endless" is not quite endless.** About 7% of the hunter's runs are still going at cycle 40:
  builds that stop fleet damage outright (Raptor escorts, flak) outlast even zero repair. Left as an
  open question rather than a new rule.

## What is still open

- Do the best card builds need an answer in Endless (for example, a hard cap on escorts), or is a
  legendary 40-jump run part of the fun? The owner's call after playing it.
- Placeholder name, blurb, verdicts, and `held` headlines, for the content pass. The name could be
  the planned "All of This Has Happened Before".
- Endless could join the weekly pool as a mutator, once a sim row says which pairs it suits.
- Next: Slow FTL, the 66-second cycle.
