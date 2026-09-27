# 0061 — Cards from the crew

**Date:** 2026-09-27
**Slice:** three upgrade cards suggested by a playtester (PRD 10.2)
**Ends with:** *The Fleet's Water Filter*, *Starbuck's Lucky Streak*, and *Gaius' Lab* on the
Recovering table, their banner art, and a thank-you in the Credits.

---

## What we set out to do

A playtester, Enrica.Manes, sent three card ideas, each with a joke:

- **The Fleet's Water Filter.** More fleet health. Someone poured poison into the main tank.
- **Starbuck's Jupiter's Calling.** Invulnerability, for luck, as long as you don't fly into a gas
  giant.
- **Gaius' Lab.** Reveal the resurrection ship, or make it show up sooner. The Cylon detector works
  100% of the time... maybe. Depends on who's asking.

All three fit the show and the game's sense of humour. They needed three adjustments first:

- **Every card has a tradeoff** (PRD 10.1). "More fleet health" and "invulnerable" on their own are
  plain buffs, so each got a cost.
- **The resurrection ship never hides.** It sits on screen from the moment it arrives, so revealing
  it would do nothing. Opening it sooner is the version that matters.
- **Spoilers.** The gas giant and "Jupiter" both point at season 3, and the game stays with what an
  early-episodes viewer knows. The Starbuck card became a lucky streak, with a new joke.

## What we built

- **The Fleet's Water Filter** (Uncommon). Each jump mends 10 more points of whatever the fleet is
  missing, per stack. The water goes to the civilians, so Tyrol fits one less hull on the Viper per
  stack, starting at the reset after you pick it.
- **Starbuck's Lucky Streak** (Uncommon). Each Raider destroyed buys half a second of cover per
  stack, banked up to a second and a half. Cover is the game's ordinary invulnerability, which
  already let Cylon rounds pass through the Viper. So while the luck holds, what misses you lands on
  the fleet. It uses the Speech's steady ring, and the status row says `Lucky`.
- **Gaius' Lab** (Questionable). The shield drops a cycle early. The Questionable rarity asks for a
  cosmetic downside, and the joke supplied it: once the shield is down, Baltar takes the credit on
  comms, waiting for a quiet strip, like the "who are you talking to" remark.
- **A card that does nothing is not dealt.** PRD rule 7 said so for features that have not shipped.
  The lab gave it a second meaning: after cycle 3 the shield drops next cycle anyway, so the lab
  stays off the table, rerolls included.

## What we measured

- `npm run sim`, compared with main: the hunter bot is unchanged on both tiers. On Viper Pilot the
  idle bot loses less often (48% to 33%), because the seeded picks now sometimes land on the Water
  Filter.
- The PRD's worst-case rule (the fleet cannot be lost if the repair rate is above the damage cap)
  says one Water Filter already makes Viper Pilot unloseable in theory: 50% repair against a 45 cap.
  Two stacks of *Continuity of Government* already crossed that line before this slice. This is an
  open question for the owner, not a settled number.

## What surprised us

- The invulnerability rule we already had turned out to be the tradeoff. We wrote nothing new for
  "rounds pass through."
- The first draft of Baltar's cue listened for the "shield exposed" event. A ship that arrives
  already open never sends one, so the cue now watches the ship become hurtable instead.
- `check:guardrails` has a sharp edge. It restores each sabotaged file in a `finally`, and a killed
  process never reaches it. A run stopped halfway left a `Date.now()` in `game.ts`. The next run
  then saved that file as its "original", and lint was what found it. Let it finish, or check the
  diff after stopping it. Two of its entries had also gone stale against lines this slice changed,
  so they were sabotaging nothing. Both are fixed, and a new entry covers the lab's filter.

## Open

- Advice lines and Baltar's credit lines are placeholders until the content pass.
- Whether the Water Filter should be +5 per stack, or cost more, given the worst-case rule.
