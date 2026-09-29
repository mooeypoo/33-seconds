# 0063 — Same rules this week

**Date:** 2026-09-28
**Slice:** challenges, part 2 of 4 (PRD 11.1, ADR-0004)
**Ends with:** a weekly challenge at the top of the Challenges sheet, the same for everyone, made
from a pool with no one having to write a new week.

---

## What we set out to do

A weekly challenge gives a community something to talk about on Monday: everyone flies the same
thing and compares. The owner chose automatic weeks over hand-written ones, so the game has to
build a week by itself and never build a bad one.

## What we decided

- **Same rules, not same spawns.** The week decides the numbers; every run still draws its own
  seed. Decision 9 (no shared scenario) stands, and nothing about the domain's draw order became a
  promise.
- **A week is a pair:** one swarm variant and one fleet variant, over Viper Pilot. The first of each
  list is the tier's own numbers, and the pair of both firsts is Story mode, so it is never a week.
  A swarm variant may only touch swarm and heavy fields, a fleet variant only the cap and repair.
  That rule is what lets every pair merge without asking which side wins a field.
- **Every pair is checked when the file loads,** not when its week comes around. A variant that is
  fine alone but out of bounds in some pair fails `check:content` today, not in March.
- **The key picks the pair.** `weekly:2026-W40` is hashed (FNV-1a) into a seed for the game's own
  random stream, which picks one of the pairs. No clock is involved after the key exists, so a link
  made in week 40 plays week 40's rules whenever it is opened.
- **UTC weeks.** The week turns over at Monday 00:00 UTC for everyone. Local weeks would split the
  community for up to a day, and a link made on a Sunday night could name a different week for its
  reader. Marked as an assumption in `isoWeek.ts`; it is the only file that would change.
- **Short names.** "Week 40" sits beside the outcome on the end screen and in the share image's
  masthead, which has room for about twenty characters. What the week changes goes in a list under
  it instead.

## What we measured

`npm run sim`, hunter bot, win rate per pair. First pass, 30 runs each:

| | Tier's own fleet | Tyrol overwhelmed (30%) | Thin hulls (cap 55) | Fresh paint (cap 40, 45% repair) |
|---|---|---|---|---|
| Tier's own swarm | (Story mode) | 40% | 47% | 100% |
| A bigger swarm | 57% | **20%** | 33% | 100% |
| Heavy traffic (3 per cycle) | **87%** | 40% | 57% | 100% |
| Weavers | 77% | 37% | 43% | 100% |

Three problems, one per column or row:

- **Fresh paint won every run.** Even cut to the lower cap alone, it still won every run. A weekly
  challenge easier than the normal game is not a challenge, so it was cut rather than tuned.
- **The bigger swarm with Tyrol overwhelmed** fell to 20%, under the pool's floor of a quarter. The
  weekly's repair variant became *Short-handed deck* at 35%, halfway between the set challenge and
  the tier.
- **Heavy traffic** changed nothing for the hunter (87%, the same as Viper Pilot). It went from
  three heavies to four.

Final pool, 60 runs per pair: every pair between 32% and 82%. The lowest are the bigger swarm with
either fleet variant (32%); the highest is Heavy traffic alone (82%).

## What surprised us

- **The fleet decides how hard a week is, not the swarm.** Each fleet variant moves every row by
  about the same amount, and the easy fleet flattened every swarm to 100%. The swarm variants
  mostly change what the week *feels* like.
- **`npm run sim` got slower**: about 165 seconds at the default 60 runs, from about 40. The weekly
  rows use only the hunter bot to keep it there.

## What is still open

- Placeholder variant names and weekly verdicts, for the content pass.
- Mutators join the pool once Endless and Slow FTL exist, and each new pair needs a sim row first.
- Changing the pool changes past weeks. Shared results carry the game version, so an old week's
  result reads as old; the game does not keep old pools.
