# 0062 — A reason to send a link

**Date:** 2026-09-28
**Slice:** challenges, part 1 of 4 (PRD 11.1, ADR-0004)
**Ends with:** a Challenges sheet on the title with *Swarm* and *Tyrol overwhelmed*, a verdict on
every challenge result, and **Beat this** for whoever opens the link.

---

## What we set out to do

The owner wanted the game to be more communal. We started by sketching a server: an anonymous
weekly tally, then maybe a leaderboard with generated callsigns. Halfway through planning it, the
owner stepped back. Everything a small community needs to compare runs could live in the link we
already had. So the server design went into ADR-0003, marked deferred, with every privacy rule we
had agreed (opt-in, counters only, the week instead of a timestamp) so nobody has to rediscover
them.

What replaced it is ADR-0004: **Story mode** stays the game, and **challenges** bend it. This slice
is the frame and the two challenges that only move numbers. Endless and the 66-second slow FTL
change rules and come in later slices; the weekly challenge comes next.

## What we decided

- **A challenge is a preset**, the same shape as the Training Run: a base tier, some of its profile
  replaced, launched through the same `launch` path. The merged profile is checked by the same
  schema as `tiers.json`, so a challenge cannot smuggle in a new knob. It can only move numbers
  that already exist.
- **Words and numbers live apart**, as everywhere else: `balance/challenges.json` for the numbers,
  `content/challenges.json` for the name, blurb, and verdicts. A challenge without words is not
  offered, and `check:content` names it.
- **Verdicts come in score bands.** The band is the highest `atLeast` the score reached, and a line
  is drawn from it on the cosmetic stream, *after* the headline and the reaction. That order
  matters: a Story mode run draws exactly what it drew before this change.
- **The link moved to version 2**, carrying the challenge and the verdict id. Version 1 links still
  open, as Story mode results. A version 1 link that claims a challenge is rejected, because the
  game never wrote one. A challenge this version does not know still opens, as "A retired
  challenge", with nothing to play, the same courtesy a retired card gets.
- **Beat this holds the rival in memory for one run.** Nothing is stored. Any other Launch forgets
  it. The comparison says who won in words ("You beat it.", "Dead even.", "Not this time."), with
  both scores, so colour is never the cue.
- **The status row names the challenge** while it is played, the way training says `Sim`.

## What we measured

`SIM_RUNS=30 npm run sim`, 30 seeded runs per row, up to 12 cycles. The hunter bot is the one that
plays to win; Viper Pilot is the baseline.

| Row | Hunter won | Hunter lost |
|---|---|---|
| Viper Pilot | 87% | 13% |
| Swarm (cap 4 → 8, floor 4 → 6, more firing and diving) | 57% | 43% |
| Tyrol overwhelmed, repair 20% of missing | 13% | 87% |
| Tyrol overwhelmed, repair 25% | 30% | 70% |
| Tyrol overwhelmed, repair 30% (shipped) | 40% | 60% |

Viper Pilot repairs 40%. Halving it made the challenge nearly impossible for a bot that ignores the
fleet between kills, and a real player defends better than the hunter does, so 30% felt like the
honest middle. Both challenges want a playtest before anyone trusts these numbers.

## What surprised us

- **Repair is a steep lever.** Ten points of repair (40% to 30%) cost the hunter 47 points of win
  rate. The swarm changes are much bigger on paper (the cap doubles by cycle 7) and cost only 30.
  The fleet's slow bleed matters more than the number of Raiders on screen.
- **The balance fingerprint had to learn about challenges.** A challenge's numbers move its scores
  exactly like a tier's, so `challenges.json` joined the fingerprint. Only the `challenges` object
  is hashed, so editing the file's readme does not demand a version bump.

## What is still open

- Placeholder names, blurbs, and verdicts, all marked PLACEHOLDER, for the owner's content pass.
- The game version stays 0.1.0: no Story mode score moved. It moves in slice 3, when Endless
  changes scoring.
- Next: the weekly challenge.
