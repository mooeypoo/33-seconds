# PRD: 33 Seconds

| | |
|---|---|
| **Status** | Living document (see below) |
| **Last changed** | 2026-09-22 (see the changelog at the end) |
| **Owner** | Moriel |
| **Related** | [Architecture guidelines (ADR-0001)](adr/0001-architecture.md), [AGENTS.md](../AGENTS.md) |

---

## How to use and change this document

This PRD holds the **rules of the game**. It is built to change as we build and play. It is not a contract.

Every section carries a tag that says how firmly it is held:

| Tag | Meaning | How to change it |
|---|---|---|
| `[Core]` | The game's identity: the 33-second cycle, the resurrection loop, the win and lose conditions, the comfort and privacy rules. | Only deliberately, with the owner's OK. |
| `[Tunable]` | Numbers, timings, and details we expect to adjust after playing. | Change freely when playtesting says so. Add a line to the changelog. |
| `[Later]` | Ideas we like but will not build yet. | Do not build until the owner promotes it. |

**Rules for changing it**
- If a slice changes a rule, **update the PRD in the same change**, and add a changelog line (date, what changed, why).
- After each milestone, play it, then review the `[Tunable]` numbers, run the fun check, and cut or adjust before starting the next one.
- If the game and the PRD disagree, the code is not automatically right. Flag it and decide.
- Numbers marked "start" or "about" are starting points. Tune by feel. If tuning by hand gets painful, a headless simulation harness (ADR-0001, D13) is the next tool to reach for.

## MVP at a glance

Read this every session. The rest of the document is detail.

- You fly a **Viper** defending a civilian **fleet** along the bottom edge. Auto-fire is always on. Move with the keyboard, or with a touch-drag anywhere on a phone.
- The game is a series of **33-second cycles**. The last 8 seconds are the FTL spool. Then the fleet jumps, and there is a short calm.
- Destroyed Raiders come back as **ghost blips** after about 6 seconds. A cap on concurrent Raiders means returns *refill* the swarm and do not add to it, so waves are endless without getting harder. The download bar (and the word) is the tell that the loop is **on**. After the resurrection ship is gone, new kills leave no ghost: the HUD says **offline**, and that is when the last wave is finite. A later graphics pass can grey the leftover blips and the wreck; the word must stay so colour is never the only cue.
- Cycle 1 teaches the loop. On cycle 2 the **resurrection ship** arrives **shielded** (visible, cannot be hurt). On cycle 4 the shield drops. Chip away at its persistent HP. Destroy it to stop the resurrections, then clear the remaining Raiders to win. It stations high on the right and drifts a little, slowly. Both cycle numbers are tunables.
- You **lose** only when **Fleet Integrity** reaches zero. Strafing runs and stray bullets hurt the fleet. There is a per-cycle damage cap and a partial repair at each jump. Your Viper being destroyed costs time, not the run.
- **Missiles** (3 per cycle) hit the first hostile thing they touch. Lock is the nearest hostile in a forward cone. Space, a large on-screen button, or a second finger fires one. **The Speech** (E or a button): 4 s of hover and invulnerability, ready again every 3 jumps.
- At each jump, **pick 1 of 3 upgrade cards** (a joke plus a plain effect). The twelve MVP cards are live. One free reroll: Ask Baltar Again.
- **Comfort rules:** no shake, wobble, or flashing. Color is never the only cue. Pause works anywhere.
- **Comms portraits and jokes** are data written later. Use clearly labeled placeholders first.
- Two difficulty tiers: **Civilian Run** (easier fleet math, same fight) and **Viper Pilot** (the default Launch). Ignoring the fleet on Viper Pilot can lose the run.

---

## 1. Summary

A short, replayable, pixel-art survivors-style shooter for a Battlestar Galactica fan Discord community. You fly a Viper defending a civilian fleet. Every 33 seconds the fleet jumps, and Cylon Raiders you destroy keep coming back until you find and destroy the resurrection ship. The endless-waves loop is the show's own theme ("all of this has happened before"), so the game's spine is also its joke.

The game plays in a browser on desktop and phone, is free, and is a fan project.

## 2. Goals, non-goals, success

### Goals
- Fun to replay: a run takes 6-8 minutes, and every run feels different because of upgrade choices.
- Looks impressive at a glance: consistent pixel art, a Dradis-style HUD, and small characters who talk to you over comms.
- Funny in a way that respects the show and its fans, and is safe for people who have only just started watching it.
- Not frustrating: failure is telegraphed, recoverable, and never a dead end.
- Plays equally well with keyboard on desktop and one thumb on a phone.
- Easy for one engineer to understand, tweak, and extend.

### Non-goals (for now)
- Multiplayer, accounts, chat, or any user-generated free text.
- Monetization, ads, or third-party trackers.
- Official assets: no show score, screenshots, voice clips, or actor likenesses.
- 3D graphics.
- A game *about* the rewatch series. The community context inspires the tone, but the game stands alone.

### Success looks like (validate in playtests, no telemetry required)
- Median run length 6-8 minutes.
- A first-time player wins on Civilian Run within a few attempts.
- Average players win Viper Pilot tier roughly 40-60% of the time (guess, to be tuned).
- Nobody reports motion discomfort. Nobody reports "I didn't know why I died."
- 60 fps on a reference mid-range phone, degrading gracefully instead of stuttering.
- Players start a second run without being asked.

## 3. Design pillars `[Core]`

1. **The joke is the theme.** Endless resurrection is the mechanic *and* the gag.
2. **Readable before impressive.** If a screen full of Raiders is confusing, cut Raiders, not clarity.
3. **Never a wall.** Every loss teaches something, and every hard moment has a counter.
4. **Humor never hides the math.** Upgrade cards show the joke in italics and the exact effect in plain text.
5. **Comfortable for everyone.** No camera shake, wobble, double vision, or rapid flashing. Ever.
6. **Respect the fandom.** Original art, audio, and text. Spoiler-safe. Never mocks the cast, only the show's *quirks*.

## 4. Audience

- Members of a Discord fan community. Some are longtime fans, some are watching the show for the first time alongside a rewatch series.
- Desktop and phone, casual sessions of a few minutes.
- May include minors, so the game collects no personal data (see section 18).

## 5. Core loop

### 5.1 The 33-second cycle `[Core]`

The cycle length is a constant. It is the identity of the game. Difficulty varies everything *around* it.

The HUD clock is enough to test the rule. **Make the countdown more noticeable later** (larger type, a real FTL ring, Gaeta and Dualla) with the Dradis HUD in M5. Do not restyle it while we are still proving the phases.

**Late-cycle border tell `[Later]`.** When about 10 or 5 seconds remain, paint the play-area border in a stronger FTL colour (red or blue), quietly, not a flash and not a full-screen wash. First play of the quiet 33 was easy to miss; this is the "spool is real" cue without shouting. Comfort still forbids rapid flashing.

| Phase | Time | What happens |
|---|---|---|
| **Arriving** | 0-5 s | Sector settles. Pending resurrections arrive first, marked as Returned. |
| **Building** | 5-25 s | Swarm ramps up to the Director's cap. You kill, collect, and position. |
| **Spooling** | 25-33 s | FTL ring fills. Gaeta and Dualla count down. The swarm presses in. Your job flips from killing to surviving. |
| **Jumping** | about 1 s | Fade, never a white flash (a still overlay in reduced-effects mode). Bullets clear. |
| **Recovering** | 8-12 s | Invulnerable. Tyrol resets your Viper hull and missiles. The fleet gets a partial repair. You pick 1 of 3 upgrades. A short comms scene plays. |

The next cycle starts when **both** the scene has ended **and** the upgrade is chosen. There is no timer on the pick. A player who wants to think can. **Live now:** picking a card *is* Continue. A Tyrol line may show over the table; it does not gate the pick. Full scenes wait.

A run is 8-10 cycles, or roughly 6-8 minutes including the Recovering scenes.

### 5.2 Arc of a run `[Tunable]`

| Cycles | What happens |
|---|---|
| 1 | Survival and build-up. Teaches the resurrection loop. |
| 2 | The resurrection ship jumps in high on the right, **shielded**. A still glass bubble plus the word "shielded" is the tell. Shots splash on the shield and do no HP. It keeps station with a slow, seeded side-to-side wander (small range, not a beat). A real path waits. Arrive cycle, expose cycle, HP, and wander are tunables for a later fairness / hardship pass. |
| 3 | Still shielded. The loop keeps teaching while the ship is a landmark. |
| about 4 | The shield drops. Fly toward it, chip away at **60 HP** that persist across jumps. **Live now:** hangar bays cycle 4 s open / 4 s sealed while it can be hurt (HUD `bays` / `sealed`; doors split or meet). Path, panic, and its own FTL wait. |
| 4+ | Clear escorts, chip away while the swarm harasses you. Progress shows at 75%, 50%, and 25% (bays go dark, launch rate drops, the ship "panics"). Weakening it makes later cycles easier. `[Later]` |
| Final 25% | The ship spools its own FTL on a 33-second countdown. Kill it before it jumps. If it escapes, it returns next cycle with a little HP restored (amount is tunable). `[Later]` |
| Kill | Slow motion, music drop, Dradis ghost blips go grey permanently. **No more resurrections.** Existing Raiders keep fighting. **Live now:** new downloads stop; pending ones still finish; live Raiders at a jump come back as that last wave. HUD switches from `loop` to `offline` (a kill no longer grows a download bar). Grey-out of leftover blips, the wreck, and slow-mo wait for the graphics pass. Jumping is not a shortcut to a clear sky. |
| Finish | The last wave is finite. Clear it to make the victory jump. **Live now:** a placeholder win overlay, then back to the title. |

### 5.3 Winning and losing `[Core]`

- **Win:** destroy the resurrection ship, then clear the remaining Raiders. A placeholder overlay says so; Continue returns to the title and Launch starts a new run.
- **Lose:** Fleet Integrity reaches zero. (Your Viper cannot end the run. Being destroyed costs time, not the game. See 8.1.) A placeholder overlay says so; Retry returns to the title. Retry-from-last-jump waits. **Live now:** Civilian Run still cannot reach zero (cap 35, repair 60%). Viper Pilot (the Launch default) can: cap 45, repair 40%, lost on the fifth full-cap cycle. HUD says `Pilot` or `Civilian`.
- On loss, a short epilogue scene plays, then retry. On Civilian Run, retry offers "from the last jump."

## 6. Resurrection `[Core]`

- A destroyed Raider becomes a **ghost blip** on Dradis, labelled as downloading, and returns after a delay (**base 6 s, tunable per tier**).
- First play of the placeholder diamond found it unreadable: a grey square is not "downloading." **Do not blink it.** Comfort forbids rapid flashing, and a blink still does not say what the wait is for. The tell is a still **download bar** that fills over the 6 s, plus the word (or a `[-----]` stand-in) so the bar is never the only cue. The placeholder is a quiet five-notch bar under the diamond; the HUD also says downloading. The real Dradis treatment waits for M5.
- Returned Raiders come out of the **Director's concurrency cap**. Resurrection does not add pressure, it *refills* the swarm. That is how waves stay endless without any single moment getting harder.
- Pending resurrections carry across a jump and arrive first in the next cycle.
- Each Raider carries a private death counter. That drives cosmetic escalation and an end-of-run stat ("Most-killed Raider: 14 times. Still not over it.").
- Once the resurrection ship is destroyed, the queue stops. Pending downloads still finish. Raiders still alive at a jump after that come back as the last wave, so jumping is not a win.
- **Loop-on / loop-off tell.** While resurrections are active, a kill becomes a ghost with a filling bar plus a word (`downloading` / `loop`). That is true from cycle 1, even before the ship is on the map. After the ship is destroyed, a kill leaves no new ghost, and the HUD says `offline`. Colour is never the only cue. The graphics pass can grey leftover blips and the wreck; do not restyle this while proving the rule.

### 6.1 Staged rollout of "smarter and angrier" `[Later]`

| Stage | What Returned Raiders do | When |
|---|---|---|
| **MVP** | Marker icon, 1.5 s spawn protection, cosmetic escalation (brighter eye, tally scratch, "x3" on Dradis). **No gameplay change.** | MVP |
| **Vengeful** | Returned Raiders prefer to attack *you* over the fleet. Resets at each jump. One tell: a pulsing eye. | v1.1 |
| **Traits** | One trait per Raider from the table below, up to a cap. | Later |

Tiers decide how much of this a player sees:

| Tier | Returned Raiders |
|---|---|
| Civilian Run | Marker only |
| Viper Pilot | Marker + Vengeful |
| Starbuck | Plus one trait per Raider |
| All of This Has Happened Before | Up to 3 traits, endless |

**Trait table (for later).** Smart traits raise accuracy, so you get hit more and the fleet gets hit less. Angry traits make Raiders sloppy, so the reverse. Each family pressures a different resource.

| Trait | Family | Tell | Counterplay |
|---|---|---|---|
| Read the Manual | Smart | Sidesteps your first shot | Pierce or spread |
| Flanker | Smart | Dradis arc from behind | Rear gun, reposition |
| Focus Fire | Smart | Visible link between two Raiders | Kill the partner first |
| Deadeye | Smart | Tight aim | Stay mobile |
| Spray and Pray | Angry | Wide fire cone | Guard the fleet edge, flak |
| Tantrum | Angry | Telegraphed ram on death | Move before it dies |
| Petty | Angry | Aims at the fleet | Intercept |
| Plus One | Angry | Brings a friend back | Area damage, queue delay |

Fairness rules for traits when they ship: at most 1 trait added per resurrection, a cap of 3, no single trait on more than about 40% of the swarm, and a pause-menu "Cylon Complaints Board" that shows what each Raider learned.

## 7. The fleet and damage `[Core]`

Two separate pools, on purpose:

| Pool | Resets at jump? | Meaning |
|---|---|---|
| **Viper hull** | Fully (Tyrol) | Your personal survivability. |
| **Fleet Integrity** | Partly | The run's real health bar. It is the only way to lose. |

### 7.1 How the fleet gets hit
1. **Strafing runs.** Some Raiders are flagged. A line runs from that Raider to the fleet, with a chevron on the hull it is diving. You can intercept them. Starts at **one** strafe token: the body farthest from you. A dive that reaches the line costs **8** integrity, then that Raider wraps. Non-flagged bodies still wrap without hurting anyone.
   - The line is a placeholder. A later graphics pass can turn it into a directional light or descending arrow. Do not restyle it while proving the rule.
2. **Stray bullets.** A Raider bullet that misses your Viper keeps flying. If it crosses the fleet line (near the bottom edge) it hits a civilian ship.
   - Two bullet states: *Aimed* (red) and *Stray* (orange). A bullet becomes Stray once it passes you, so the consequence is visible before it lands.
   - Damage per hit starts at **1** of **100** integrity (1%).
   - *Raptor Escort* soaks a stray whose landing x is within about **10** wu of an on-station Raptor, before flak rolls. One escort per stack (max 2), **3** HP, then hangar until the next cycle. Strafes are not soaked.
   - Galactica's flak waits behind *Flak Enthusiast*: first stack intercepts about **40%** of strays (seeded). Extra stacks add 15%. Without the card every stray that crosses the line still hits, so the pool stays readable. Strafes are not flak. Placeholder puffs at the stray and a muzzle on Galactica; real `flak_burst` later.
   - Standing between the swarm and the fleet catches strays. Your Viper hull resets each jump, so absorbing hits is cheap. That makes a bodyguard build viable.

### 7.2 Two fairness rules
1. **Per-cycle damage cap.** No single cycle can take more than the tier's cap: **35** on Civilian Run, **45** on Viper Pilot.
2. **Partial repair on jump.** The fleet regains a fraction of its *missing* integrity: **60%** on Civilian Run, **40%** on Viper Pilot. Heavy damage still heals faster in absolute terms.

### 7.3 Tuning math `[Tunable]`
If the fleet takes maximum damage `D` every cycle and repairs fraction `r` of what is missing at each jump, its lowest point settles at `100% x (1 - D / r)`.

**Rule of thumb: a player who takes maximum damage every cycle survives forever if and only if the repair rate is greater than the damage cap.**

| Tier | Damage cap | Repair rate | Worst case (max damage every cycle) |
|---|---|---|---|
| Civilian Run | 35% | 60% | Never falls. Lowest point about 42%. |
| Viper Pilot | 45% | 40% | Fleet lost in cycle 5. |
| Starbuck | 50% | 25% | Fleet lost in cycle 3. |

Losing on Viper Pilot requires taking near-cap damage over and over, meaning ignoring the fleet almost entirely. A player who intercepts a few strafing runs stays comfortably alive. Both numbers live in the tier profile, so retuning is a one-line change.

### 7.4 HUD and flavor
- Fleet shown as **ten pips plus `n/max`** near the jump clock, and as **ten placeholder hulls** on the olive line. Colour is never the only cue.
- A stray marks the nearest hull with an orange notch (not a flash). Hulls ding to match the pips as integrity drops. Pause-menu silly names (for example, "The Slightly Leaky Freighter") wait. No show ship names.
- The slightly larger hull in the middle is Galactica. *Flak Enthusiast* gives it a muzzle puff when it eats a stray. Without that card it is visual only.
- Reaching zero ends the run. A placeholder lose overlay; Retry returns to the title. Civilian Run still cannot reach zero (PRD 7.3). Viper Pilot can. The epilogue and retry-from-last-jump wait.
- The line is still a rigid row. A later pass can give the hulls a slight up/down and a little sideways idle (the same idea as the resurrection ship's station-keeping) so they do not feel stuck. Not enough to leave the bottom edge.
- End-of-run stat: "Civilians endangered by your dodging: 47." `[Later]`

## 8. Combat

### 8.1 The Viper `[Tunable]`
- Free movement in world units, with a little acceleration smoothing so it feels spacey but not drifty.
- **Auto-fire** always on. No fire button. The gun points at the swarm side (up); it does not track a target. Start at about 5 shots per second.
- Hull is reset by Tyrol at each jump. Start at **5** hits, so you outlast one Raider's 3 HP. If destroyed mid-cycle, you eject and are picked up after about 3 seconds. That costs downtime, never the run. A short cover on pickup so a round already in the cockpit is not an instant second eject.
- **Eject and download must not look like the same pop.** Default death is an eject: you leave the board. *Anyone Could Be a Cylon* is a download: you never leave (PRD 10.2). **Live now:** the hull vanishes and the HUD says `ejected`; a still placeholder seat (not a flash) sits where you were until pickup. The card keeps the hull, adds a red-eye pixel, and the HUD says `two transponders`. **Graphics pass:** a real pilot-ejection symbol (seat / chute) for eject only. The download never uses that symbol. Colour is never the only cue.
- **Hull is visible on the Viper** as a row of pips (count, not only a colour), the same language as Raider pips. The HUD also names `hull n/max`.
- **Mid-cycle hull pickups** ("life") wait. They should be rare and need a funny reason. Design them with the Recovering bonus cards, not as a combat drop in this pass.
- Raider guns **aim at the Viper** (perfect lead, no spread). A later look may switch them to **straight down** (a column you bodyguard while you hunt). Not this pass.

### 8.2 Missiles `[Tunable]`
- Start each cycle with 3. Tyrol refills them at each jump. Heavy Raiders sometimes drop a pickup. `[Later]`
- **A missile hits the first hostile thing it touches**, so it is never wasted. If a Raider drifts into its path, that Raider explodes in a small blast.
- **Targeting:** the nearest hostile inside a forward cone (about 70 degrees, limited range), not the nearest overall. Ties break by lowest entity ID. A small reticle shows the lock before you fire.
- Escorts in front of the resurrection ship soak missiles, so clearing a lane matters.
- Upgrades swap the targeting policy instead of adding flags (see the upgrade catalog).
- **Live now:** Space, a second finger, or a large on-screen button. One press, one missile; holding does not dump the rack. A missile one-shots a Raider and deals **8** to the resurrection ship. Pickups, blast radius, and upgrade-swapped targeting wait.

### 8.3 Specials `[Tunable]` (Mandatory Firmware Update is `[Later]`)
One special per run, chosen at run start. Each has an original-text comms moment and no recorded audio from the show.

| Special | Effect | Recharge (proposed) |
|---|---|---|
| **The Speech** | For 4 s all Raiders hold fire and hover, and you are invulnerable. The jump clock keeps running. Adama's portrait delivers original text. | Every 3rd jump |
| **Mandatory Firmware Update** | Raiders within about a third of the screen go inert for 6 s: they float, do not fire, but still block bullets from both sides. Their red eye stops sweeping and an hourglass appears. The resurrection ship and heavy Raiders are immune ("requires admin rights"). Killing an inert Raider still queues its return. | Every 2nd jump |

Recharge counts are jumps, not seconds. That is easy to explain, and it fits the 33-second rhythm and pause.

MVP ships The Speech only. The loadout pick screen arrives with the second special.

**Live now:** E or a large on-screen button, opposite the missile. Placeholder comms line, no portrait. Raiders hover and hold fire; incoming rounds that hit the Viper are eaten so they do not become fleet strays. Jump clock keeps running. Ready at launch, then every 3 jumps. Mandatory Firmware Update and the loadout pick wait.

### 8.4 Hitboxes `[Tunable]`
- A Raider's collision circle is **8 world units**, near the drawn box (half-width 7), a little generous so a graze counts. It started at 6; two plays called that tight. Widened with the Viper hull in the same fairness pass.

## 9. Keeping the screen readable `[Core]`

These rules exist so "smarter and angrier" never becomes "a big mass mess."

- **Director cap** on concurrent Raiders, set per tier. Starts at **2**. A kill is a dip; a return is a refill, not a third body.
- **Attack tokens.** Only K Raiders (2 to 5 by tier) can be in their firing state at once. The rest fly but hold fire. Starts at **1** so two bodies do not double the incoming fire before the fairness pass. The nearest Raider holds the token; a still eye means unarmed, a sweep means it may shoot.
- **Hard caps** on enemy bullets and particles, lower on mobile.
- Only Cylons are red. A still red eye means inert, and a sweeping eye means active. Color is never the only cue (see section 16).
- **Adaptive quality:** if frame time stays bad for a couple of seconds, visual effects step down automatically. Simulation is never simplified.

## 10. Progression: upgrades

### 10.1 Rules `[Core]`
1. **The name is the joke. The tooltip is plain.** Joke in italics, exact effect on its own line.
2. **Every card has a tradeoff or a synergy.** No plain "+10% damage."
3. **Rarities:** Common (stacks to 3), Uncommon (stacks to 2), **Questionable** (one copy, large benefit, a cosmetic downside).
4. **Cosmetic downsides never involve camera motion, flashing, or contrast changes.** They can be text, audio, or a sprite gag.
5. **Three cards at each jump,** plus one free reroll, "Ask Baltar Again," which gives a fresh (more panicky) opinion.
6. **Advice is honest.** Baltar and Roslin tag cards with soft hints. A hint never misleads.
7. **Cards that depend on a later feature are not offered until that feature ships.**

### 10.2 Catalog `[Tunable]` (cards marked Later are `[Later]`)

Rarities are initial proposals. **MVP** marks the launch set of 12.

**Your Viper**

| Card | Effect | Rarity | Set |
|---|---|---|---|
| *Anyone Could Be a Cylon* | Once per cycle, a lethal hit "downloads" you into a fresh Viper with 1.5 s invulnerability. A red-eye pixel appears on your Viper until the next jump, and Gaeta reports two transponders for one pilot. Not an eject: you stay on station, and the ejection seat never appears. | Uncommon | MVP |
| *Accidentally Wide* | Viper is 25% chunkier: more hurtbox, more intercepted strays. | Common | MVP |
| *Bootleg Hooch (Unlabeled)* | **+35% fire rate, -20% movement speed.** Starbuck's portrait looks flushed and her lines pick up the odd "*hic*." | Uncommon | MVP |
| *Look At Me, I'm the Threat Now* | Raiders aim at you harder: fewer strays, more shots on you. | Common | Later |

**Firepower**

| Card | Effect | Rarity | Set |
|---|---|---|---|
| *Overcompensating Cannon* | Slower, bigger shots that pierce several Raiders. | Uncommon | MVP |
| *Gratuitous Explosions* | Kills detonate in a small radius, so kills can chain. | Uncommon | Later (readability risk) |
| *Backwards Compatibility* | A weak rear-facing gun against flankers. | Common | Later |
| *The Speech: Extended Cut* | The Speech lasts twice as long. Gaeta reports the Raiders are "just... waiting." Only offered if The Speech is your special. | Questionable | Later |

**Missiles**

| Card | Effect | Rarity | Set |
|---|---|---|---|
| *Personal Vendetta* | Missiles lock the resurrection ship whenever it is on screen. -20% missile speed, and escorts still intercept. | Uncommon | MVP |
| *Party Favors* | A missile bursts into 4 minis on impact. Great against the swarm, weak against the ship. | Uncommon | Later |
| *Hoarder* | +2 missile capacity. Your gun fires 10% slower from the weight. | Common | Later |

**Anti-resurrection**

| Card | Effect | Rarity | Set |
|---|---|---|---|
| *Your Call Is Important to Us* | Resurrection takes +2 s per stack. Ghost blips show a tiny hold-music icon. | Common | MVP |
| *Spoilers* | Ghost blips sit on the return column. Shooting a blip delays that download 3 s per stack. | Uncommon | MVP |
| *Hangar Door Slam* | +30% damage to the resurrection ship while its bays are open, per stack. | Uncommon | MVP |
| *Factory Reset* | MVP effect: 15% chance per stack that a killed Raider fails to download and does not return. (When traits ship, this becomes "a returning Raider forgets its trait.") | Uncommon | Later |

**Fleet**

| Card | Effect | Rarity | Set |
|---|---|---|---|
| *Continuity of Government* | Fleet damage cap −10% per stack. Roslin's favorite. | Common | MVP |
| *Flak Enthusiast* | Galactica intercepts 40% of strays, plus 15% per extra stack. Visible flak bursts. Strafes still land. | Common | MVP |
| *Suspiciously Shiny Freighter* | A decoy that strafing runs target first. Small HP, regenerates. | Uncommon | Later |
| *Raptor Escort* | A Raptor patrols the fleet line and soaks strays. After 3 hits it returns to hangar and comes back next cycle. | Uncommon | MVP |
| *Imaginary Six* | See below. | Questionable | MVP |

**Live now:** twelve MVP cards at Recovering, pick 1 of 3, one free *Ask Baltar Again*. Joke in italics, exact effect in plain text, placeholder flair in JSON. Picking a card starts the next cycle. *Anyone Could Be a Cylon* is a download in place, not a shorter eject (see 8.1). *Spoilers* moves the blip to the return column and lets the gun delay it. *Flak Enthusiast* is Galactica eating strays (40% then +15% per extra stack); without it every stray still hits. *Hangar Door Slam* is +30% factory damage while bays are open. *Raptor Escort* is one body per stack on the fleet line (3 HP, hangar, relaunch next cycle). *Imaginary Six* is a formation wingman: thin beam, half a gun hit, strafes then strays, in range, untouchable. Advice portraits, comms "who are you talking to", and Later cards wait.

### 10.3 *Imaginary Six* (Questionable, one copy) `[Tunable]`

An escort only you can see.

- **Overwatch:** she flies in formation beside your Viper and auto-fires a thin beam, at about half the damage of your gun, prioritizing **strafing runs and bullets headed for the fleet**. She is the fleet-defense escort, where the Raptor is the fleet-soak escort. Live numbers: 0.5 damage, same interval as the gun, **140** wu range. She does not shoot parked Raiders or the factory.
- **Untouchable:** she cannot be hit and does not soak damage. She is imaginary. She leaves the board while you are ejected.
- **Cosmetic downside:** other characters occasionally ask who you are talking to. Starbuck's replies read as one side of a conversation. Six's portrait style differs from the others. Comms lines wait.
- **Presentation:** a distinct outline sprite with a steady (never flickering) glow. The beam is a persistent line to the current target, not a strobe. HUD says `six`. Card text stays vague: "An ally only you can see."
- **Balance watch:** her beam overlaps with *Flak Enthusiast* and *Raptor Escort*. The simulation harness should confirm that stacking all three does not make the fleet unloseable.

### 10.4 Sample builds (where replay value comes from)
- **Bodyguard:** Accidentally Wide, Raptor Escort, Flak Enthusiast.
- **Queue Sniper:** Spoilers, Your Call Is Important to Us, Hangar Door Slam.
- **Glass Cannon:** Bootleg Hooch, Overcompensating Cannon, Anyone Could Be a Cylon.

## 11. Difficulty `[Tunable]`

Named tiers, with a mutator system planned for later.

| Tier | Feel | In MVP |
|---|---|---|
| Civilian Run | Easier fleet numbers, same fight. Marker-only Returned Raiders, retry from last jump | Yes |
| Viper Pilot | Default | Yes |
| Starbuck | Reckless, one trait per returned Raider | Later |
| All of This Has Happened Before | Endless, up to 3 traits, no win | Later |

**Mutators (later):** No Dradis, Silent Space, Everyone's a Cylon, Adama's Watching, Sleepless (no calm between jumps).

Tiers change numbers in one typed profile (see ADR-0001, D9), never rules. **Live now:** only fleet cap and repair differ, in TypeScript at `src/balance/tiers.ts`. **Soon:** one JSON object per difficulty (typed, validated on load) so hit, hull, Director, and repair numbers can move without a code change. Do that before adding a third tier. **Later:** after a win, invite a return on a harder profile without making Civilian Run feel like practice.

**Player-facing names:** Civilian Run (easier fleet, same fight, not a tutorial). Viper Pilot (default Launch). Code ids stay `civilian-ship` / `viper-pilot`.

## 12. Comms `[Tunable]`

Small pixel portraits pop up to talk to you. They are the game's personality, and they must never get in the way.

### 12.1 Roster

| Speaker | Role | Voice |
|---|---|---|
| **Adama** | Cycle start, big Raider entrance, resurrection ship arrival, victory | Stern, few words |
| **Starbuck** | Multi-kills, close calls, resurrection quips, and an occasional cycle-start aside | Cocky, a bit reckless |
| **Gaeta** | Galactica FTL status: spool %, "solution plotted," "spool complete" | Precise, operational |
| **Dualla** | Fleet FTL status and civilian readiness: "Nine of twelve ready." | Calm, relayed |
| Tigh (cameo) | Low hull, long stretches without a kill, occasional grumbles about paperwork and Vipers | Gruff, terse |
| Baltar (cameo) | Upgrade advice: panicky, flashy, a bit self-interested | Panicky |
| Roslin (cameo) | Upgrade advice: strategic, long-term, political | Calm |
| Tyrol (cameo) | Anchors every Recovering scene, reacts to how much damage you took | Overworked |

Gaeta and Dualla announce the same jump from two angles. The civilian count creeps up in the last seconds and the slowest ship always makes it just in time.

### 12.2 Rules
- **Never blocks, pauses, or captures input.** It is a non-interactive overlay.
- One message at a time. Low-priority lines are dropped, not queued, if a higher-priority line is waiting.
- **Quiet during crises:** flavor is suppressed at low hull or during a boss entrance. Only critical lines (jump countdown) get through.
- Cooldowns per character, plus no-repeat memory. Cameos come from a **shuffle bag**, so everyone appears before anyone repeats.
- Placement: top HUD band, under the jump ring, never in the middle of play or the mobile thumb zone.
- A short radio-squelch blip masks the pop-in.
- **Duration:** `clamp(1.5 s + characters / 12, 4 s, 8 s)`, multiplied by a player setting (Short 0.75x, Normal 1x, Long 1.5x).
- A **comms log** in the pause menu keeps the last 20 lines.
- All comms timing runs on the game clock, so pause works.
- The banter random stream is separate from gameplay, so choosing a joke never changes a seeded run.
- Lines that share a moment live in one pool (same trigger, priority, and cooldown; the jokes are an array). A pool may set `chance` below 1 so that speaker is only sometimes eligible. The game still shows one line. Starbuck's cycle-start pool starts at 0.25, so Adama opens most cycles.

**Live now:** one line at a time, from JSON pools, with a letter-block portrait and the speaker's name. The line is a strip in the top HUD band, above the instruments, so it can be read and a touch on it still steers. Cycle start (Adama, and sometimes Starbuck), FTL spool, the resurrection ship's arrival, a missile, Recovering, the Speech, win, and loss. `{seconds}`, `{percent}`, `{count}`, and `{total}` are filled when the line is chosen. Critical spool text can replace a lower line. Flavor stays quiet at 1 hull. The line follows the game clock, so pause freezes it. Derived quips (a kill streak, a close call, a fleet hit, ship milestones, card offers, "who are you talking to"), the comms log, the duration setting, and Recovering scenes that gate the next cycle wait.

### 12.5 Wingman squad `[Later]`

Not built. The player is the only Viper until this is promoted. Two choices stay tied together, because the lines and the ships are one decision:

- **Solo.** Lines may keep talking to Starbuck, Kara, or Thrace as the pilot. Her own lines are a voice on the radio.
- **Squad.** A few other pilots fly with you at the start of a run. They shoot little or not at all, wander on a seeded path, and block bullets. They are guards, not a second player. Each jump brings only some of them back, so the run gets harder as the guard thins out. Comms can name those pilots, not only Starbuck.

Do not add the ships, and do not rewrite the name-calling lines, until one of these is chosen.

### 12.3 Recovering scenes
8-12 seconds, 2-4 beats, two portraits trading lines. Tyrol anchors. Scene lines depend on how much the fleet and Viper were damaged: "Not a scratch on her. I'm suspicious" for a clean cycle, exasperation for a wrecked one.

### 12.4 Content format
Lines and scenes are data, not code. The authoritative format, trigger list, length limit, and coverage targets are in [`content/CONTENT-SCHEMA.md`](content/CONTENT-SCHEMA.md), and the voices are in [`content/VOICE-GUIDE.md`](content/VOICE-GUIDE.md). A speaker file groups jokes that share a moment:

```json
{
  "speaker": "dualla",
  "pools": [
    {
      "trigger": "FtlSpoolProgress",
      "priority": "critical",
      "cooldownSeconds": 20,
      "lines": [
        { "id": "dualla-ftl-spool-progress-01", "text": "Fleet FTL spooling. Jump in {seconds}.", "weight": 3 }
      ]
    }
  ]
}
```

## 13. Controls and pause `[Core]`

### 13.1 Desktop
| Action | Keys |
|---|---|
| Move | WASD or arrow keys (by physical key position, so it works on any layout) |
| Missile | Space |
| Special | E |
| Pause | Esc or P |

Shift is deliberately not used for the special. On Windows, pressing it five times opens the Sticky Keys prompt.

### 13.2 Phone
- **Floating drag stick:** the first touch anywhere in the play area sets an origin, and dragging from it steers. Small dead zone, a maximum radius, and analog speed so a small drag is a gentle nudge.
- **The stick shows itself while you hold it** `[Core]`. Without this, a player cannot tell that touching means flying, or which way they are asking the Viper to go:
  - A faint pixel **ring at the origin** marks where the touch landed, and a **dot** sits where the drag currently is, clamped to the ring's edge at maximum radius. Origin, direction, and how much of full speed you are asking for are all readable at a glance.
  - Inside the dead zone the dot is centered and visibly neutral, so "nothing is happening" looks deliberate rather than broken.
  - It appears on touch down and fades out when the finger lifts. Faint enough never to compete with the Raiders, drawn on the pixel grid like everything else.
  - It is not the only cue for the player's own movement: the Viper banks and its engine glow stretches with thrust.
  - Reduced-effects mode keeps the ring and dot. They are information, not decoration, so the fade is what shortens, never the indicator.
- **A first-run hint tells new players to drag** `[Core]`: on a touch device, before the first drag of a player's first run, a short line near the bottom of the play area says that dragging anywhere flies the Viper. It disappears on the first touch, is remembered as seen, and reappears only if storage is unavailable. No timers on it, and it never blocks play. **Live now:** remembered in player settings; the session still hides it after the first drag if storage fails.
- It works **wherever the finger lands**, on any overlay layer, except on visible buttons and menus.
- **Missile:** a large on-screen button (one-handed), or a tap from a second finger anywhere. **Live now:** both.
- **Special:** a large on-screen button in the corner opposite the missile (one-handed), or E. **Live now:** The Speech.
- **Pause:** a button of at least 44 x 44 px in a top corner, inside the safe area.
- **The play area is one fixed 9:16 portrait world** (for example 270 x 480 logical pixels). On phones it fills the screen, with thumbs at the bottom and HUD and comms at the top. On desktop it is centered, and the side margins hold the comms log and decoration. Phone landscape pillarboxes. (Default, see section 19.)

### 13.3 Pause
- Triggers: pause button, Esc or P, and **auto-pause** when the tab is hidden, the window loses focus, the orientation changes, or a pointer is cancelled (a notification or an edge swipe).
- Resume with a 3-2-1 countdown, which also clears any stuck keys or phantom stick.
- The pause menu shows mute, a reduced-effects toggle, and later the full settings screen, the comms log, and the Cylon Complaints Board. **Live now:** mute and reduced-effects. The full settings screen waits for M6.
- **Abandon run** (back to title, discard the current run) lives on that pause menu. **Live now:** one button, only while paused, not during the resume countdown. The next Launch starts a new run. Distinct from the lose screen's Retry, and from retry-from-last-jump, which still waits. Win and lose already return to title.
- Everything time-based follows the game clock, including comms, cooldowns, the FTL ring, and audio, so nothing keeps running while paused.

## 14. Look and sound `[Tunable]`

- **Internal resolution about 270 px on the short side**, upscaled with nearest-neighbor. Particles and explosions share the same pixel grid.
- **Palette of 16-24 colors.** Gunmetal grays and olive for the fleet, Dradis green for the HUD, and a single hot red reserved for Cylons.
- **Silhouettes carry the fandom:** a wedge-shaped Viper with twin engine glow, an arrowhead Raider with a sweeping red eye, a heavy Raider variant, a chunky original-design resurrection ship, and Galactica as a slow parallax silhouette in the background, so you are always visibly defending something.
- About 25 small sprites for gameplay. Portraits are 32 x 32 with mouth-closed, mouth-open, and blink frames plus one signature expression, 36 frames in total for 9 portraits (see [`art/ART-DIRECTION.md`](art/ART-DIRECTION.md) for the full asset list).
- Portraits are drawn by **costume and silhouette**, not actor likeness.
- Tools: Aseprite, LibreSprite, or Piskel for art. ZzFX or jsfxr for effects. BeepBox for original chiptune loops.
- Optional scanline and CRT look: on by default on desktop, off by default on phones, with a toggle.
- Fonts are self-hosted. A pixel font for style, plus a **readable-font toggle** for people who struggle with small pixel type.

### 14.1 Sound is never a surprise `[Core]`

Unexpected audio is the rudest thing a web page can do. These are hard rules, not tunables.

- **Nothing makes a sound before the player's first deliberate gesture.** Audio initializes on the Launch button and not before, so an opened tab is silent.
- **The title screen says the game has sound and offers the choice there**, next to Launch, in words. The player decides before anything can play.
- **Mute is always one tap away while playing:** in the HUD beside the pause button and in the pause menu, at least 44 x 44 px, inside the safe area.
- **The mute control says what it is in text**, not by color alone, and its state is readable at a glance (see section 15).
- **Muting is instant and total**, music and effects together, and unmuting never dumps queued sound.
- **The choice is remembered** in versioned local storage, and the game works when storage is unavailable by falling back to the default.
- **Default: sound on**, because the title screen announces it before a sound is possible. Flip it with a changelog line if playtesting says otherwise.
- Separate music and effects volumes belong in settings. Mute stays a single, always-available control that never hides in a menu.

**Live now:** the title says the game has sound. Mute sits next to Launch, in the HUD beside pause, and on the pause menu, as the words Sound on / Muted (not an icon), at least 44 × 44 px. The choice is stored in `thirty-three:v1:settings`. Phaser still boots with `noAudio`. AudioPort, volumes, and actual sound wait.

## 15. Accessibility and comfort `[Core]`

Hard rules:

- **No camera shake, wobble, double vision, or rapid flashing.** Flash rate stays far below 3 per second. Whiteouts become a quick fade in reduced-effects mode.
- `prefers-reduced-motion` is respected by default, with an in-game toggle. **Live now:** OS preference OR the pause-menu toggle. The toggle cannot turn OS reduced-motion off. Presenters read the combined flag at boot, so a mid-run change applies after a reload.
- **Color is never the only cue.** Cylons are red *and* have a sweeping eye; inert is a still eye *and* an hourglass; strays are orange *and* have a longer trail.
- Audio cues have visual equivalents, so the game is fully playable muted.
- Sound never starts by itself, and mute is always one tap away (section 14.1).
- Comms duration setting, comms log, and no timers on menu decisions.
- One-handed play on phones.
- Menus, settings, and comms are reachable by screen reader (comms uses a polite live region, rate-limited).
- Text stays legible: the readable-font toggle, and minimum sizes for anything the player must read.

Later: remappable keys, left-handed layout, gamepad.

## 16. Content, IP, and spoilers `[Core]`

- **All art, audio, and text are original.** No show score, screenshots, voice clips, or actor likenesses. No quoting show scripts. Short catchphrases ("so say we all," "frak") are used sparingly as references.
- The title screen states it is an **unofficial fan project** and is not affiliated with or endorsed by the show's rights holders or anyone in the cast. The game never uses a real person's name or likeness.
- **Spoiler policy:** every line must make sense to someone who has only seen the first few episodes. No line implies that a specific named character is a Cylon. Gags about suspicion target the *player*. *Imaginary Six* is approved because her presence is established very early in the show, and the card text still stays vague.
- Humor targets the show's *quirks*, never the cast, the community, or real people. Avoid humor built on stereotypes.
- Community-contributed lines come in by pull request and go through the content checklist in AGENTS.md.
- This is not legal advice. Check with the community's moderators before launch, and consider whether a heads-up to the cast or their team is appropriate.

## 17. Privacy and data `[Core]`

**MVP collects no personal data.**

- No accounts, no free-text input, no cookies, no third-party scripts or fonts, no analytics.
- Local storage holds only: settings (volume, comms duration, reduced effects, readable font), best scores per tier, and the "seen" state for scenes and hints. It is versioned, validated when read, and treated as untrusted because a user can edit it.
- **Leaderboard (later):** no free-text names. Players get a **generated callsign** or pick from a curated list. That removes both privacy risk and moderation burden. Stored: callsign, score, tier, daily seed date, timestamp. No accounts, so no personal data to delete. Server-side plausibility checks on scores. The leaderboard is for fun, not cheat-proof (see open questions).
- **Soon — share a finished run.** After a win or a loss, a link back to this site shows that run's points and details graphically and offers another game. A shareable image may go with the link; the page is useful without it. Not built yet. The link should carry the result itself: no account, no free text, nothing stored, nothing that identifies a person. A server-side share id needs the leaderboard design note before any server code.
- If analytics are ever added: aggregate, cookieless, and disclosed on the title screen. Requires an ADR first.
- The community may include minors, so the design assumes it does.

## 18. Scope and milestones `[Tunable]`

### MVP scope
- 33-second cycles with Recovering scenes and pause.
- Swarm with Director cap and attack tokens. One or two Raider types plus one heavy.
- Resurrection with the Returned marker, 1.5 s protection, and cosmetic escalation.
- Resurrection ship with persistent HP and milestones.
- Viper hull reset, fleet pool with damage cap and partial repair, stray bullets, strafing runs.
- Auto-fire plus missiles with the targeting-policy design.
- The Speech as the only special.
- The 12-card MVP upgrade set.
- Comms with Adama, Starbuck, Gaeta, Dualla, and the cameo roster.
- Civilian Run and Viper Pilot tiers.
- Desktop and phone controls, accessibility settings, local settings and best scores.

### Milestones (a guide, not a contract)

Each milestone ends with something you can play in a browser and on a phone. After each one: play it, review the tunables, decide what to cut or change, and update this PRD before starting the next. The order can change.

| # | Milestone | You can... | Includes |
|---|---|---|---|
| M1 | **Something moves** | fly and shoot on your phone and on desktop | Repo and guardrails (see AGENTS.md), Vue shell and Phaser canvas, fixed-step loop, Viper movement (keyboard and touch stick), auto-fire, one Raider flying down, pause. **Platform check on a real phone** (ADR-0001, D4). |
| M2 | **The loop** | play three minutes of the core loop | Director cap and attack tokens, Raiders that shoot, Viper hull and eject, resurrection (ghost blips, Returned marker), a 33-second cycle with spool, jump, and a short Recovering pause. **Fun check:** with placeholders, is this fun? If not, fix it before adding more. |
| M3 | **Stakes and a win** | win or lose a full run (6 to 8 minutes) | Fleet Integrity, strafing runs, stray bullets, damage cap and partial repair, HUD (fleet pips, jump ring), the resurrection ship with persistent HP, win and lose screens, two tiers. |
| M4 | **Build variety** | make different builds | Upgrade picks (about 6 cards, growing to 12), reroll, missiles and targeting, The Speech. |
| M5 | **Personality** | feel the humor | Comms overlay, portraits (placeholder art), banter from JSON, Recovering scenes, Dradis-style HUD, audio, filters and effects with a reduced-effects mode. Your content and asset passes plug in here. **Player settings and storage arrive here, before the first sound**, so mute, the sound notice, and the reduced-effects toggle exist the moment there is anything to mute (section 14.1). Pause menu also gets **Abandon run** (back to title). |
| M6 | **Polish and launch** | share it | Accessibility pass, phone QA, the full settings screen (built on the storage seam from M5), title screen and logo, disclaimer, local best scores, deploy. |

**After MVP:** Vengeful, traits, Mandatory Firmware Update and loadout screen, remaining cards, more tiers, mutators, daily seed and leaderboard, gamepad, PWA install.

## 19. Decisions and open questions

**Defaults chosen so work is never blocked.** Change any of them with a changelog line.

| # | Question | Default |
|---|---|---|
| 1 | Name | **33 Seconds**. Logo gag: "33 ~~MINUTES~~ SECONDS." Disclaimer: "Unofficial fan project, not affiliated with or endorsed by the show's rights holders or anyone in the cast." |
| 2 | Fleet layout | A fixed line along the bottom edge. Later: a slight idle (up/down and a little sideways) so it does not feel glued. Revisit after a playtest. |
| 3 | Resurrection ship tuning | Start with HP sized so focused fire takes about 2 to 3 cycles, and it returns with about 10% of its max HP when it escapes. Tune by feel. |
| 4 | Special recharge | The Speech recharges every 3rd jump. |
| 5 | *Imaginary Six* balance | Weak beam at about half your gun's damage. Check how it stacks with flak and the Raptor in playtests. |
| 6 | Playable pilot | Starbuck only (cosmetic). A wingman squad that blocks bullets, and lines that name those pilots, wait together (12.5). |
| 7 | Endless tier | `[Later]` |
| 8 | Leaderboard integrity | `[Later]`. Needs a short design note before any server code. Assume client scores can be forged. |
| 9 | Daily seed | `[Later]`. Same seed means the same scenario (spawns and card offers), not a frame-identical replay. |
| 10 | Analytics | None. |
| 11 | Languages | English. All text is data, so translation stays possible. |
| 12 | Community heads-up | The owner does this before going public. |
| 13 | Viper heading | Fixed heading toward the swarm side. It banks left and right, and does not rotate. |
| 14 | World orientation | One fixed 9:16 portrait world, centered on desktop with margins for comms and the log. |
| 15 | Civilian "assists" | Dropped. Civilian Ship just has easier numbers. |
| 16 | Visual construction | Hybrid: hand-drawn sprites for ships, and code and filters for the background and effects (ADR-0001, D4b). |

**Still open (ask before deciding):** the license, the leaderboard and daily-seed design, and PWA scope.

---

## Changelog

| Date | Change | Why |
|---|---|---|
| 2026-09-20 | Made the PRD a living document: status tags, "MVP at a glance," iterative milestones, and defaults for the previously open questions. Title set to 33 Seconds. Civilian "assists" dropped. | Start iterative implementation. |
| 2026-09-20 | Added section 14.1, "Sound is never a surprise": no audio before the first gesture, the title screen announces sound and offers the choice, a prominent mute in the HUD and the pause menu, and the choice remembered. Default is sound on. | Unexpected audio is annoying, and the rule needs to exist before the first sound does. |
| 2026-09-20 | Moved player settings and storage from M6 to M5, ahead of the first audio. M6 keeps the full settings screen. | So no build can ever have sound without a mute control (section 14.1). |
| 2026-09-20 | Expanded the drag stick's indicator in 13.2 from one clause into rules (origin ring, drag dot clamped at maximum radius, neutral inside the dead zone, kept in reduced-effects mode) and added a first-run "drag anywhere to fly" hint. | A player who cannot see the stick cannot tell that touching means flying, or which direction they are asking for. Raised during the first slice, which shipped the stick without any indicator. |
| 2026-09-20 | Clarified auto-fire in 8.1: the gun points at the swarm side and does not track a target. Starting rate about 5 shots per second. | Fixed heading (decision 13) makes "forward" always up. Recording it keeps missile targeting (a cone, M4) from being read back into the gun. |
| 2026-09-20 | Added 8.4: Raider hitbox starts slightly inside the hull (6 wu). First phone-view play found it tight; do not widen until there is a swarm and a real-phone check. | So a later retune is a decided revisit, not a forgotten complaint. |
| 2026-09-20 | Jumping is a fade, never a white flash, matching section 15. Recovering does not auto-advance until cards exist: Continue is the untimed pick. | Comfort forbids a white flash. A timer on Recovering would be a timer on a menu decision. |
| 2026-09-20 | The 33 on the HUD stays quiet for now. A louder countdown (type, ring, voices) waits for the M5 HUD. | First play of the clock was for the rule, not the look. |
| 2026-09-20 | Viper hull starts at 3 hits; eject downtime about 3 s; short cover on pickup. | So the first time something shoots back, the cost is time, not the run. |
| 2026-09-20 | Resurrection is a 6 s download that refills the Director cap (starts at 1). Pending ghosts finish in transit and arrive first after a jump. Returned have 1.5 s spawn protection; shots pass through. | So a kill is the show's joke, not a thinner swarm, and a jump cannot erase a download. |
| 2026-09-20 | Ghost tell is a filling download bar plus a word, not a blink. First play of the diamond was unreadable. | A blink would flash and still not say "downloading." |
| 2026-09-20 | Fairness pass recorded, not applied: 3 hull feels too thin once Raiders shoot; 6 wu Raider hitbox still feels tight. Later: raise hull and/or add mid-cycle hull pickups, and retune the hitbox in the same pass. | First shooting-back play ejected too fast. Do not chase one number live. |
| 2026-09-20 | Director cap starts at 2. Attack tokens start at 1: nearest Raider shoots, the other flies. | So a kill refills a swarm instead of emptying the sky, without doubling fire before the fairness pass. |
| 2026-09-20 | Viper hull is shown as pips on the ship plus `hull n/max` on the HUD. | First play of incoming fire vanished the Viper with no readable health. This is a tell, not the fairness pass. |
| 2026-09-20 | Fairness pass target: Viper hull should be higher than one Raider's 3 HP. Still not applied. | So the player outlasts an individual Cylon. Hearts and hitbox stay in that same pass. |
| 2026-09-20 | Fleet Integrity starts at 100. A stray that crosses the fleet line costs 1, capped at 35 per cycle, then 60% of missing repairs at the jump. HUD is ten pips plus a number. Flak, strafing, lose screen, and civilian sprites wait. | So the run has a health bar you can dent without inventing the rest of M3. |
| 2026-09-21 | Fairness pass may switch Raider fire from aimed-at-Viper to straight down (a column you intercept). Not applied. | First fleet play: aimed shots punish standing still, and leaving a lane does not obviously cost the civilians. |
| 2026-09-21 | Per-ship fleet hit tells wait until civilian ships exist. Number-only HUD stays until then. | First play of stray damage was hard to notice. Do not add a second tell on an empty line. |
| 2026-09-21 | Viper hull is 5. Raider hitbox is 8 wu. Aimed fire stays. Mid-cycle life pickups wait for the Recovering bonus design (rare, needs a joke). | First shooting-back play ejected faster than a Raider dies. |
| 2026-09-21 | Late-cycle border tell waits: at about 10 or 5 seconds left, quietly paint the play-area edge in FTL red or blue. Not a flash. | The quiet 33 is easy to miss; do not restyle the clock while proving the fight. |
| 2026-09-21 | Ten placeholder civilian hulls sit on the fleet line. A stray notches the nearest one; dinged hulls match the pips. Galactica is the larger middle hull, visually only. | Number-only fleet damage was easy to miss. |
| 2026-09-21 | One Raider at a time may strafe: farthest from the Viper, a line and chevron as the tell, 8 integrity if it reaches the fleet, then it wraps. | So a body passing the line can mean something, and intercepting is a job. |
| 2026-09-21 | Strafe tell stays a plain line and diamond. A directional light or descending-arrow look waits for the graphics pass. | First play of the dive was for the rule, not the art. |
| 2026-09-21 | Resurrection ship arrives on cycle 4, parked at the right edge, 60 HP that persist across jumps. Destroying it stops new downloads. Clear the last wave to win. Path, bays, panic, escape FTL, slow-mo, and the lose screen wait. | M3 needs a win, not the whole ship drama. |
| 2026-09-21 | Resurrection ship arrives **shielded on cycle 2**, shield drops on **cycle 4**. Both cycle numbers are tunables (`RESURRECTION_SHIP_ARRIVES_CYCLE`, `RESURRECTION_SHIP_VULNERABLE_CYCLE`). Shots cannot chip HP while the bubble is up. | Cycle 4 was too late a first look; the ship should be a landmark before it is a target. |
| 2026-09-21 | Resurrection ship stations higher on the right and drifts slowly side to side in a small seeded range. Fleet idle motion (slight up/down and a little sideways) is documented, not applied. | A parked rectangle read as stuck. The fleet can get the same treatment in a later pass. |
| 2026-09-21 | Loop-on / loop-off tell: HUD `loop` while kills still download, `offline` after the ship is gone (no new ghost bar). Grey leftover blips and the wreck wait for the graphics pass. Colour is never the only cue. | A dead factory must read differently from an endless swarm, including on cycle 1 before the ship is visible. |
| 2026-09-21 | Arrive cycle, expose cycle, HP (60), and wander stay as play numbers. Fairness / hardship may retune them. | First play of the ship worked; do not chase the details live. |
| 2026-09-21 | Reaching zero Fleet Integrity ends the run (placeholder overlay, Retry to title). Civilian Ship numbers still cannot reach zero; Viper Pilot numbers wait. | M3 asked for a lose screen. The overlay is the rule; the numbers are the later fairness pass. |
| 2026-09-21 | Missiles: 3 per cycle, refill at the jump. Nearest hostile in a 70° forward cone. Hits the first body on the path. One-shots a Raider, 8 damage to the resurrection ship. Space, on-screen button, or second finger. Lock reticle is a ring with a four-quadrant cross. Holding does not dump the rack. Pickups and policy upgrades wait. | M4 starts with a weapon you choose, not a card table. |
| 2026-09-21 | The Speech: 4 s hover and invulnerability, E or a button, ready at launch then every 3 jumps. Placeholder comms. Incoming rounds that hit the Viper are eaten. Firmware Update and the loadout pick wait. | M4's special is a panic button, not a second gun. |
| 2026-09-21 | Recovering: pick 1 of 3 from six starter cards. One free reroll. Picking a card is Continue. Effects: Accidentally Wide, Bootleg Hooch, Your Call Is Important to Us, Overcompensating Cannon, Personal Vendetta, Anyone Could Be a Cylon. Remaining catalog, portraits, and comms scenes wait. | M4's variety is a table, not a second gun. |
| 2026-09-21 | Eject vs download: default death leaves the board (~3 s, HUD `ejected`, placeholder seat until pickup). *Anyone Could Be a Cylon* stays on station (red-eye, `two transponders`). Real ejection-seat art waits for the graphics pass. Colour is never the only cue. | A second life that looks like eject is not a card. |
| 2026-09-21 | *Continuity of Government* is in the live starter set: fleet cycle-damage cap −10% per stack. Spoilers, Hangar Door Slam, flak, Raptor, Imaginary Six still wait on their systems. | Grow the table with cards whose rules already exist. |
| 2026-09-21 | *Spoilers*: with the card, ghost blips sit on the return column (spawn height, death X) and a gun hit delays that download 3 s per stack. The killing round does not also delay. Missiles ignore ghosts. Jump still finishes transit. Placeholder plus on the blip; real art later. | Queue sniper: see the future, spend gun time to hold it. |
| 2026-09-21 | *Flak Enthusiast*: first stack intercepts 40% of strays (seeded, scenario stream only when the card is held). Extra stacks +15%, cap 85%. Strafes still land. Without the card every stray still hits. Placeholder puffs; real `flak_burst` later. Hangar Door Slam, Raptor, Imaginary Six wait. | Galactica's guns are a card, not a silent 40% on every run. |
| 2026-09-21 | Hangar bays: 4 s open / 4 s sealed while the resurrection ship is exposed. Starts open when the shield drops. Combat ticks only. HUD `bays` / `sealed`; doors split or meet. *Hangar Door Slam* is +30% factory damage per stack while open. Path, panic, escape FTL wait. Raptor and Imaginary Six remain. | The queue-sniper card needs a door you can see. |
| 2026-09-21 | *Raptor Escort*: one escort per stack (max 2), patrols the fleet line, soaks strays whose landing x is within 10 wu. 3 HP then hangar until the next cycle; relaunch at full hull. Raptor, then flak, then fleet. Strafes still land. Placeholder olive wedge and pips; HUD `raptor n/max` or `hangar`. Imaginary Six remains. | The bodyguard card needs a body on the line. |
| 2026-09-21 | *Imaginary Six*: one copy. Formation wingman, thin beam at 0.5 damage, gun interval, 140 wu range. Strafes first, then strays. Untouchable, gone while ejected. Steady outline and a persistent beam (not a flash). HUD `six`. Comms "who are you talking to" waits. MVP table of 12 is live. | The last MVP card is the fleet-defense escort only you can see. |
| 2026-09-22 | Tiers: Launch is Viper Pilot (fleet cap 45, repair 40%). **Civilian Run** is the easier fleet (35 / 60%), same fight, not a tutorial. HUD `Pilot` / `Civilian`. Numbers live in `src/balance/tiers.ts`. Soon: JSON objects per difficulty for the rest of the math. Later: invite a harder return after a win. Abandon run waits for the M5 pause menu. Retry-from-last-jump and the epilogue wait. | So ignoring the fleet can actually end the run, and the two buttons say what they do. |
| 2026-09-22 | Player settings: versioned `StoragePort`, mute on title / HUD / pause, reduced-effects toggle (OS OR in-game), drag hint remembered. No audio yet. Abandon run still waits. | So mute exists before the first sound (14.1), and localStorage is treated as hostile. |
| 2026-09-22 | **Abandon run** on the pause menu returns to the title and discards the run. Not available during the resume countdown. Retry-from-last-jump still waits. | A stuck or unwanted run needed a way back without pretending it was a loss. |
| 2026-09-22 | Soon: a shareable result. A link back to the site shows the run's points and details and offers another game. An image may accompany it. The result belongs in the link, not on a server. | So a finished run can be shown to someone else without collecting personal data. |
| 2026-09-22 | Comms: one JSON line at a time (placeholder text, letter portrait plus name). Spool is critical. Flavor drops at 1 hull. Pause freezes the line. The pick still starts the next cycle; full Recovering scenes wait. | Personality starts as a line that cannot get in the way. |
| 2026-09-22 | Writer files group jokes that share a trigger, priority, and cooldown into one pool. A pool may set `chance` below 1. Starbuck gets a couple of cycle-start lines at chance 0.25, so Adama still opens most cycles. The loader still reads one object per line until that pack replaces the placeholders. | So a writer sees one list per moment, and a cycle-start aside can stay rare. |
| 2026-09-22 | Comms loads those pools, including `chance` and the four placeholders. The line sits in the top HUD band. **Later (12.5):** either the player is the only Viper and lines may name Starbuck, or a few non-firing wingmen guard the start of a run and the lines name them too. Not built. | The jokes can play, and the squad is one decision with the way people are addressed. |
