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

- **The Fleet's Water Filter** (Uncommon). After a calm cycle, each jump mends 10 more points of
  whatever the fleet is missing, per stack. "Calm" means under half the damage cap. Past that, the
  bonus fades, and it is gone after a cycle at the cap: the filter can't keep up while someone is
  shooting the tank. The water goes to the civilians, so Tyrol fits one less hull on the Viper per
  stack, starting at the reset after you pick it. The fade was not in the first draft; see below.
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

- `npm run sim`, first draft against main: the hunter bot was unchanged on both tiers. On Viper
  Pilot, the idle bot lost less often (48% to 33%). That looked mild. It wasn't.
- **The worst-case rule.** The PRD says a fleet cannot be lost if the jump repair is above the
  damage cap (7.3). The first draft's flat +10% put Viper Pilot's repair at 50% against a cap of 45:
  unloseable in theory, from one card.

## What we revisited

**Is the theory real in play?** The normal sim picks cards at random, which blurs one card's effect.
So a throwaway script forced the Water Filter on and picked nothing else: 60 seeds on Viper Pilot,
at 0, 1, and 2 copies, for each bot. Runs lost out of 60:

| Version | Idle | Hunter | Guard |
|---|---|---|---|
| No card | 60 | 47 | 60 |
| Flat +10% (first draft) | 0 | 0 | 0 |
| Bonus fades across the whole cap | 60 | 45 to 48 | 60 |
| Whole until half the cap, then fades (shipped) | 60 | 39 to 40 | 60 |

- **The flat bonus was a disaster.** One copy took every bot, including one that never moves, from
  always losing to never losing.
- **A bigger cost on the Viper could not fix it.** The worst-case rule only compares two fleet
  numbers, the repair and the cap. A second hull point makes the card feel pricier and leaves the
  math where it was. The cost had to live on the fleet side.
- **Fading across the whole cap overcorrected.** It closed the hole, but the bots rarely have a
  quiet cycle, so the card did next to nothing. At 2 copies the hunter did slightly worse, which was
  the hull cost showing through.
- **Fading over the top half is the keeper.** A cycle at the cap still gets nothing, so the worst
  case is the tier's own, however the card stacks. The bot that defends went from 13 wins to 21.
  The bots that don't defend still lose. The card rewards the thing it is about.
- The owner chose the half-cap fade over a smaller flat bonus (+5 per stack). A smaller flat bonus
  would still cross the line at two copies.
- The PRD's tuning math now says so: a card that adds repair must add nothing after a cycle at the
  cap. A guardrail sabotage checks that the filter never gives a bonus after a full-cap cycle.

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
- Two stacks of *Continuity of Government* already put Viper Pilot's cap (36.5) under its repair
  (40), so they break the same rule from the other side. That was true before this slice. It needs
  its own look.
- The bots are weak players (the hunter wins 13 of 60 on Viper Pilot with no cards), so people will
  earn the filter's bonus more often than the table shows. The next playtest should say whether 10
  points is too much.
