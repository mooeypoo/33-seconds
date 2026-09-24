# PRD: 33 Seconds

| | |
|---|---|
| **Status** | Living document (see below) |
| **Last changed** | 2026-09-24 (see the changelog at the end) |
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
- At each jump, **pick 1 of 3 upgrade cards**. A closed row is the name and the joke. Opening it shows the effect, and a line each from Baltar and Roslin. **Apply** counts 3-2-1, then starts the next cycle. One free reroll, labeled **Refresh the list**. That sheet is not covered by the pause menu.
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

The countdown sits in the top HUD band beside fleet health, outside the playfield, so it is visible while flying and never under the Viper. It shows whole seconds and a bar that fills across the cycle. Spooling turns the number and the bar amber and the caption says Spooling, so colour is not the only cue. Between cycles the caption says Jumping or Jumped and the bar stays full, with no number. On a wide window (the CIC shell, 13.2) the same clock is an FTL ring in the FLEET console: it fills across the cycle, and for the spool it turns amber, the panel edge thickens, and the caption says Spooling. **Live now:** both placements. Gaeta and Dualla already call the spool in comms.

**Late-cycle border tell `[Later]`.** When about 10 or 5 seconds remain, paint the play-area border in a stronger FTL colour (red or blue), quietly, not a flash and not a full-screen wash. First play of the quiet 33 was easy to miss; this is the "spool is real" cue without shouting. Comfort still forbids rapid flashing.

| Phase | Time | What happens |
|---|---|---|
| **Arriving** | 0-5 s | Sector settles. Pending resurrections arrive first, marked as Returned. |
| **Building** | 5-25 s | Swarm ramps up to the Director's cap. You kill, collect, and position. |
| **Spooling** | 25-33 s | FTL ring fills. Gaeta and Dualla count down. The swarm presses in. Your job flips from killing to surviving. |
| **Jumping** | about 1 s | Fade, never a white flash (a still overlay in reduced-effects mode). Bullets clear. |
| **Recovering** | 8-12 s | Invulnerable. Tyrol resets your Viper hull and missiles. The fleet gets a partial repair. You pick 1 of 3 upgrades, then Apply. A short comms scene plays in the strip and does not have to finish. |

The next cycle starts when the player presses **Apply**, after the same 3-2-1 used to resume from pause. There is no timer on the pick. A player who wants to think can. The hand is three cards. Each names its rarity in a word and a frame style (never colour alone), says what taking it does to your stack (New, One copy, or Owned 1/3 → 2/3), and carries its art banner, name, and joke. On a wide window every card also shows the exact effect and Baltar and Roslin at once; on a phone the cards stack and a card shows those once it is opened, so the joke is read first. Tapping a card selects it; a second tap leaves it selected. **Apply** ends the Recovering scene if it is still speaking, counts 3-2-1, and only then starts the cycle. **Refresh the list** deals one new hand, clears the selection, and then is gone.

**Live now:** on a wide window (the CIC shell) the pick is a full-screen requisition board: three cards side by side, fleet, hull, and missiles in the header, and the Recovering scene beside Refresh and Apply in the footer. On a phone it is a sheet in the lane, the cards stacked, Refresh and Apply pinned to its bottom, and the Speech and Missile buttons step aside so the scene has the whole strip. A card without its art file shows an empty banner slot (`assets/cards/`, docs/art/SPRITE-FILES.md). The pause menu does not cover this sheet: not from focus loss, a hidden tab, Esc, or the Pause button. The mute button is off the screen until there is sound. Phaser still pauses its own loop while the tab is hidden, and resumes it when the tab is visible, so the sheet is where you left it. A blur that leaves the tab visible does not stop Phaser. The scene plays in the strip under the playfield while the sheet is up. The newest bonus name sits between fleet health and the top controls. Older bonuses show as a count beside that name. A card you already own shows the stack this pick would become, such as 2/3.

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

- A destroyed Raider becomes a **ghost blip** on Dradis, labelled as downloading, and returns after a delay (**base 6 s**, staggered by the tier's `downloadJitterSeconds` so returns do not arrive in lockstep).
- First play of the placeholder diamond found it unreadable: a grey square is not "downloading." **Do not blink it.** Comfort forbids rapid flashing, and a blink still does not say what the wait is for. The tell is a still **download bar** that fills over the 6 s, plus the word (or a `[-----]` stand-in) so the bar is never the only cue. The placeholder is a quiet five-notch bar under the diamond; the HUD also says downloading. The real Dradis treatment waits for M5.
- Returned Raiders come out of the **Director's cap**, and a return never pushes the swarm past it: a finished download waits for a free slot. A pending download holds a slot, so a refill does not add pressure, **except below the Director's floor** (section 9): then a fresh Raider comes anyway, so a run of kills does not empty the sky. (Changed 2026-09-24 with the owner: "always about 3 to 5 on screen.")
- Pending resurrections carry across a jump and arrive first in the next cycle.
- Each Raider carries a private death counter. That drives cosmetic escalation and an end-of-run stat ("Most-killed Raider: 14 times. Still not over it.").
- Once the resurrection ship is destroyed, the queue stops and nothing fresh arrives. On its death the swarm **tops up to the cap once: the last wave**. Pending downloads still finish (and wait for a slot). Raiders still alive at a jump after that come back as the last wave, so jumping is not a win.
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
- Fleet shown as **ten pips plus a percentage**, labeled Fleet health, in the top band, and as **ten placeholder hulls** on the olive line. The jump clock is beside it in the top band (5.1). Under them, a status row names the state in words: `Hull n/max` or `Ejected`, `Two transponders`, `Loop on` or `Loop offline`, the resurrection ship (`Ship shielded`, `Ship n/max · Bays open` or `Sealed`, `Ship down`), `Raptor n/max` or `Raptor hangar`, and `Six`. An alert state (ejected, last hull point, a ship you can hurt) also gets a thicker amber edge. Under that, one objective line says what the run wants now: hold, the ship is shielded, destroy the ship, or clear the last wave. Its words are content in `content/hud.json`. Colour is never the only cue. The debug readout is a development aid: it floats in the desktop margin while testing, and a shipped build does not include it.
- A stray marks the nearest hull with an orange notch (not a flash). Hulls ding to match the pips as integrity drops.
- **Civilian ship names** (decided 2026-09-24, built in ADR-0002 Phase 2): the FLEET console lists the ten hulls by name. Galactica is always the middle one. The other nine are drawn at random for each run, without repeats, from a pool in `src/content/fleet.json` that the owner writes (at least 9 names; about 25 or more keeps repeats between runs rare). The draw uses the comms stream, so a name never changes the fight. Original silly names only (for example, "The Slightly Leaky Freighter"): no show ship names. Format in `content/CONTENT-SCHEMA.md`.
- The slightly larger hull in the middle is Galactica. *Flak Enthusiast* gives it a muzzle puff when it eats a stray. Without that card it is visual only.
- Reaching zero ends the run. A placeholder lose overlay; Retry returns to the title. Civilian Run still cannot reach zero (PRD 7.3). Viper Pilot can. The epilogue and retry-from-last-jump wait.
- The line is still a rigid row. A later pass can give the hulls a slight up/down and a little sideways idle (the same idea as the resurrection ship's station-keeping) so they do not feel stuck. Not enough to leave the bottom edge.
- End-of-run stat: "Civilians endangered by your dodging: 47." `[Later]`

## 8. Combat

### 8.1 The Viper `[Tunable]`
- Free movement in world units, with a little acceleration smoothing so it feels spacey but not drifty.
- **Auto-fire** always on. No fire button. The gun points at the swarm side (up); it does not track a target. Start at about 5 shots per second.
- Hull is reset by Tyrol at each jump. Start at **5** hits, so you outlast one Raider's 3 HP. If destroyed mid-cycle, you eject and are picked up after about 3 seconds. That costs downtime, never the run. A short cover on pickup so a round already in the cockpit is not an instant second eject.
- **Eject and download must not look like the same pop.** Default death is an eject: you leave the board. *Anyone Could Be a Cylon* is a download: you never leave (PRD 10.2). **Live now:** the hull vanishes and the HUD says `ejected`; a placeholder parachute (canopy, lines, and a seat, not a flash) drifts in one slow arc from where you were until pickup. Reduced effects keeps the chute and skips the arc. The card keeps the hull, adds a red-eye pixel, and the HUD says `two transponders`. **Graphics pass:** a real pilot-ejection symbol (seat / chute) for eject only. The download never uses that symbol. Colour is never the only cue.
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
- Fighters are drawn at their art size: the Viper **32 world units** across, a Raider **24**, a heavy Raider **36** (docs/art/ART-SCALE.md). Same size on a phone and a wide window.
- A Raider's collision circle is **10 world units**, a little inside its 24-unit picture, so a shot past the wingtip misses. The whole picture (12) let a parked Viper kill two and a half times as many Raiders in the simulator.
- The Viper's is **8 world units**, a quarter of its picture, so a round that only clips a wing misses. Smaller than the picture on purpose.
- History: the Raider circle started at 6, two plays called that tight, and it went to 8 with the Viper hull. The art pass (2026-09-24) doubled the pictures and resized the circles with them.

### 8.5 The heavy Raider `[Tunable]`

Built 2026-09-24 (ADR-0002 3.3), with the owner's rules: its **own queue**, and it **never downloads**. Only Raiders resurrect.

- From the tier's `heavyFromCycle`, up to `heavyPerCycle` arrive each cycle, the first 8 s in and then every 8 s, never more than `heavyMax` alive. None arrive once the resurrection ship is gone. They do not count against the Raider cap or floor.
- Bigger (hitbox 15 wu, picture 36), slower (30 wu/s against the Raider's 46), 8 hull. A missile does 3 to it rather than a kill.
- It carries its **own attack token**: it may fire whenever it is above the Viper, whatever the Raiders' tokens. It does not dive the fleet.
- It leaves at the jump like any live body, and does not come back as the last wave.
- Its arrival calls the big-Raider comms lines. Until `raider_heavy` is drawn, it is the Raider picture at 1.7× with eight hull pips: size and pips are the tell, not a colour.

## 9. Keeping the screen readable `[Core]`

These rules exist so "smarter and angrier" never becomes "a big mass mess."

- **Director cap and floor** on concurrent Raiders, set per tier and **per cycle** (ramps in `src/balance/tiers.json`). The cap is never exceeded. While the resurrection ship lives, the floor keeps at least that many up: below it, fresh Raiders come even while downloads are pending. Between floor and cap, a return is a refill, not an extra body.
- **Movement.** Raiders dive straight down their column. A per-cycle share (`sineShare` in `tiers.json`) instead weaves a shallow sine around it: 18 world units either side, one sway every 2.6 seconds, always inside the lane. Readable paths you can cut across, never a zigzag. `[Tunable]`
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
5. **Three cards at each jump,** plus one free reroll. The button says **Refresh the list**. It deals a fresh hand once. A dealt hand can still speak about a card on that table.
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

**Live now:** twelve MVP cards at Recovering, pick 1 of 3, one free **Refresh the list**. A card shows the name and the joke in italics; the exact effect in plain text and a line each from Baltar and Roslin, with their portraits, show with it on a wide window, or once it is opened on a phone. **Apply** counts 3-2-1, then starts the next cycle. Dealing the hand can speak about a card on that table; the Recovering scene takes the strip while it plays, and Apply ends that scene. *Anyone Could Be a Cylon* is a download in place, not a shorter eject (see 8.1). *Spoilers* moves the blip to the return column and lets the gun delay it. *Flak Enthusiast* is Galactica eating strays (40% then +15% per extra stack); without it every stray still hits. *Hangar Door Slam* is +30% factory damage while bays are open. *Raptor Escort* is one body per stack on the fleet line (3 HP, hangar, relaunch next cycle). *Imaginary Six* is a formation wingman: thin beam, half a gun hit, strafes then strays, in range, untouchable. Once each time she appears, someone asks who the pilot is talking to, after the louder line has finished. Later cards wait.

### 10.3 *Imaginary Six* (Questionable, one copy) `[Tunable]`

An escort only you can see.

- **Overwatch:** she flies in formation beside your Viper and auto-fires a thin beam, at about half the damage of your gun, prioritizing **strafing runs and bullets headed for the fleet**. She is the fleet-defense escort, where the Raptor is the fleet-soak escort. Live numbers: 0.5 damage, same interval as the gun, **140** wu range. She does not shoot parked Raiders or the factory.
- **Untouchable:** she cannot be hit and does not soak damage. She is imaginary. She leaves the board while you are ejected.
- **Cosmetic downside:** other characters occasionally ask who you are talking to. **Live now:** Tigh, Adama, or Gaeta, once each time she appears, after any louder line has finished. Starbuck's half of that conversation, and Six's own portrait, wait.
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

Tiers change numbers in one typed profile (see ADR-0001, D9), never rules. **Live now:** one JSON object per difficulty in `src/balance/tiers.json`, validated on load and in CI: fleet cap, repair, and per-cycle ramps for the Director cap and the attack and strafe tokens (a ramp's last value holds for later cycles). The two tiers still differ only in fleet numbers. `npm run sim` reports how each tier plays against simple bots. **Later:** after a win, invite a return on a harder profile without making Civilian Run feel like practice.

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
- Placement: a fixed-height band under the playfield, in the same column on a phone and on a desktop. It does not cover the playfield, the fleet, or the clock, and a longer line wraps inside the band instead of resizing the playfield. Never in the middle of play. A touch on the line still steers. The fleet score stays above. Pause and About stay above with it, and fold under a Settings control when that band is too narrow for the row. Mute joins that row when there is sound.
- A short radio-squelch blip masks the pop-in.
- **Duration:** `clamp(1.5 s + characters / 12, 4 s, 8 s)`, multiplied by a player setting (Short 0.75x, Normal 1x, Long 1.5x).
- A **comms log** in the pause menu keeps the last 20 lines, newest first. **Live now.** On a full desktop the COMMS console also shows the three before the current one.
- All comms timing runs on the game clock, so pause works.
- The banter random stream is separate from gameplay, so choosing a joke never changes what happens in the fight.
- Lines that share a moment live in one pool (same trigger, priority, and cooldown; the jokes are an array). A pool may set `chance` below 1 so that speaker is only sometimes eligible. The game still shows one line. Starbuck's cycle-start pool starts at 0.25, so Adama opens most cycles.

**Live now:** one line at a time, from JSON pools, with the speaker's 64×64 portrait and name. Closed, open, and blink step on the game clock, two changes a second. Reduced effects holds the closed mouth. The signature frame is that closed picture until those files exist. The other person in a scene stays on closed. A name with no picture keeps the letter block. A scene shows the previous speaker beside the one who is talking. The line sits in a fixed-height band under the playfield, and a touch on it still steers. It does not cover the score, and a longer line does not resize the playfield. Pause and About stay above. On a narrow band they fold under Settings. The mute button is off the screen until there is sound. About pauses and opens how to play and what the game is. On a touch screen, Speech and Missile flank the dialogue strip, under the playfield. Cycle start (Adama, and sometimes Starbuck), FTL spool, the resurrection ship's arrival, a missile, the Speech, win, and loss. A dealt hand can speak about a card on that table, and a reroll can replace that line, unless a Recovering scene is using the strip. Someone asks who the pilot is talking to once each time Imaginary Six appears, and only when the strip is empty. `{seconds}`, `{percent}`, `{count}`, and `{total}` are filled when the line is chosen. Critical spool text can replace a lower line. A new hand can replace a line that is still up. Flavor stays quiet at 1 hull. The line follows the game clock, so pause freezes it. A fleet hit, a Raider coming back, and the factory's death each get a line. Three kills inside 2 seconds, a Cylon round that misses inside 16 units of the Viper, hull at 2 or below (once until it is repaired), and 12 seconds without a kill are noticed from the fight, not from new rules. The factory is called at 75, 50, and 25 percent of the hull it has left, with that percent in the line. The spool is also called at 5 seconds and at 2. Those timings are assumptions until a playtest. A heavy Raider is not in the fight, so those lines stay quiet. The duration setting waits.

### 12.5 Wingman squad `[Later]`

Not built. The player is the only Viper until this is promoted. Two choices stay tied together, because the lines and the ships are one decision:

- **Solo.** Lines may keep talking to Starbuck, Kara, or Thrace as the pilot. Her own lines are a voice on the radio.
- **Squad.** A few other pilots fly with you at the start of a run. They shoot little or not at all, wander on a seeded path, and block bullets. They are guards, not a second player. Each jump brings only some of them back, so the run gets harder as the guard thins out. Comms can name those pilots, not only Starbuck.

Do not add the ships, and do not rewrite the name-calling lines, until one of these is chosen.

### 12.6 Where the line sits on a wide window

**Live now (ADR-0002 Phase 2):** on a window at least 1100 px wide, the line moves into the COMMS console to the right of the lane, with the same 64 × 64 file shown at exactly 2× (128 CSS pixels, nearest-neighbor). The console also holds the recent log, the loadout (rarity is a border style as well as a colour), the missile and Speech readouts with their keys, and Pause and About. The fleet readouts move to the FLEET console on the left. On a laptop-sized window (under 1360 × 820) the ship list folds to one line, the log moves to the pause menu, and the loadout shows the newest card and a count. If the doubled portrait pixels look too coarse, a 128 × 128 redraw can be asked for later.

### 12.3 Recovering scenes
8-12 seconds, 2-4 beats, two portraits trading lines. Tyrol anchors. The closing beat points at the next jump. Each beat uses the same reading time as a line. If that would run past 12 seconds, the beats shrink together so the scene still finishes.

The scene plays in the comms strip while the pick is up. Apply does not wait for it. Touches on the strip still steer.

The band is how the cycle that just ended went, remembered through the jump repair. **Clean:** the fleet took nothing and the Viper lost no hull. **Wrecked:** the fleet took 16 or more, or the Viper lost 3 or more hull, or the pilot ejected (a download that puts them back still counts). **Rough:** anything else. Those two numbers are assumptions until play says otherwise.

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
- **Where the buttons sit:** only on a touch screen, and never on the playfield. Speech is left and Missile is right of the comms line in the band under the playfield, so thumbs rest at the bottom corners and the fleet stays uncovered. They stay in place between cycles, dimmed and disabled, so the strip does not jump. A desktop has no on-screen action buttons: Space and E do it.
- **Pause:** a button of at least 44 x 44 px in the top band, inside the safe area. **About** is the same size. It pauses and opens how to play and what the game is. Resume closes that sheet. When the top band is too narrow for that row, the controls fold under one Settings button. When sound exists, Mute sits in that row, labeled Sound on / Muted, and folds with them.
- **The play area is one portrait world.** A phone is 270 x 480. A wide window is 324 x 480, so the column is wider. The Viper, the Raiders, the fleet and the shots are the same size on both. The canvas draws two pixels per world unit, so the art has twice the detail of the world (docs/art/ART-SCALE.md). On a phone the column is the screen width, with thumbs at the bottom corners of the screen, the fleet score, the clock, and Settings at the top, and comms in a fixed band under the playfield. On a wide window (1100 px and up) the lane sits between two consoles, FLEET on the left and COMMS on the right (the CIC shell, 12.6), on the title as well as in a run: the title shows them on standby. Between a phone and 1100 px the column is centered with the strips above and below. On a phone the objective rides at the front of the status row. Phone landscape pillarboxes. (Default, see section 19.)

### 13.3 Pause
- Triggers: Pause, About, Esc or P, and **auto-pause** when the tab is hidden, the window loses focus, the orientation changes, or a pointer is cancelled (a notification or an edge swipe). About opens the how-to sheet instead of the pause menu. Resume on that sheet returns to the run. **The Recovering pick does not pause.** The sheet already waits for Apply, so Esc, Pause, and About stay out of it. The mute button is off the screen until there is sound. The 3-2-1 after Apply does pause, because the fight is about to start.
- Resume with a 3-2-1 countdown, which also clears any stuck keys or phantom stick.
- The pause menu shows mute, a reduced-effects toggle, and later the full settings screen, the comms log, and the Cylon Complaints Board. **Live now:** reduced-effects. Mute returns to this menu with the first sound. The full settings screen waits for M6.
- **Abandon run** (back to title, discard the current run) lives on that pause menu. **Live now:** one button, only while paused, not during the resume countdown. The next Launch starts a new run. Distinct from the lose screen's Retry, and from retry-from-last-jump, which still waits. Win and lose already return to title.
- Everything time-based follows the game clock, including comms, cooldowns, the FTL ring, and audio, so nothing keeps running while paused.

## 14. Look and sound `[Tunable]`

- **Internal resolution 270 x 480 on a phone and 324 x 480 on a wide window**, upscaled with nearest-neighbor. Particles and explosions share the same pixel grid.
- **Palette of 16-24 colors.** Gunmetal grays and olive for the fleet, Dradis green for the HUD, and a single hot red reserved for Cylons.
- **Silhouettes carry the fandom:** an original angular-wedge Viper with twin engine glow (a similitude, not a traced show ship), an arrowhead Raider with a sweeping red eye, a heavy Raider variant, a chunky original-design resurrection ship, and Galactica as a slow parallax silhouette in the background, so you are always visibly defending something. **Live now:** the Viper (64×64 shown at 16×16, or 20×20 on a wide window), the Raider (48×48 shown at 12×12, or 15×15 on a wide window, three eye frames), the shots (player and aimed 12×20 shown at 3×5, stray 12×28 shown at 3×7), and the small explosion use the PNGs in `assets/`. The fleet is still placeholders, and it stays the small size on both screens.
- About 25 small sprites for gameplay. Portraits are 64 × 64, shown at 64 CSS pixels, with mouth-closed, mouth-open, and blink frames plus one signature expression, 36 frames in total for 9 portraits (see [`art/ART-DIRECTION.md`](art/ART-DIRECTION.md) for the full asset list). A later UI pass may show that same file at about 128 CSS pixels on a large screen (12.6).
- Portraits are drawn by **costume and silhouette**, not actor likeness.
- Tools: Aseprite, LibreSprite, or Piskel for art. ZzFX or jsfxr for effects. BeepBox for original chiptune loops.
- Optional scanline and CRT look: on by default on desktop, off by default on phones, with a toggle.
- Fonts are self-hosted. A pixel font for style, plus a **readable-font toggle** for people who struggle with small pixel type. **Live now:** VT323 for headings, HUD labels, numbers, and buttons; Atkinson Hyperlegible for sentences (comms, card text, pitch, notes). The pause menu's Readable font switches everything to Atkinson and is remembered.

### 14.1 Sound is never a surprise `[Core]`

Unexpected audio is the rudest thing a web page can do. These are hard rules, not tunables.

- **Nothing makes a sound before the player's first deliberate gesture.** Audio initializes on the Launch button and not before, so an opened tab is silent.
- **The title screen says the game has sound and offers the choice there**, next to Launch, in words. The player decides before anything can play.
- **Mute is always one tap away while playing:** in the HUD beside the pause button and in the pause menu, at least 44 x 44 px, inside the safe area.
- **The mute control says what it is in text**, not by color alone, and its state is readable at a glance (see section 15).
- **Muting is instant and total**, music and effects together, and unmuting never dumps queued sound.
- **The choice is remembered** in versioned local storage, and the game works when storage is unavailable by falling back to the default.
- **Default: sound on**, because the title screen announces it before a sound is possible. Flip it with a changelog line if playtesting says otherwise.
- Separate music and effects volumes belong in settings. Mute stays a labeled Sound on / Muted control. On a narrow top band it lives inside Settings, one tap away, and it is not replaced by an icon.

**Live now:** there is no sound, so the mute button and the title's sound notice are not on screen. `MuteControl` and the `muted` flag in `thirty-three:v1:settings` stay, ready for the rules above. Phaser still boots with `noAudio`. AudioPort, volumes, and actual sound wait. The button comes back, in words, the moment something can play.

## 15. Accessibility and comfort `[Core]`

Hard rules:

- **No camera shake, wobble, double vision, or rapid flashing.** Flash rate stays far below 3 per second. Whiteouts become a quick fade in reduced-effects mode.
- **Hit feedback without flashing** (ADR-0002 3.4, live): a hit that does not kill throws a few warm 3-pixel sparks from where the round struck (200 ms), nudges the Raider's picture 2 pixels up the lane and lets it settle (120 ms), and a round on the shield ripples the bubble. A heavy Raider's burst is drawn larger. No global hit-stop: kills are too frequent for a freeze to feel good. With reduced effects, a single still spark marks the hit and fades, and nothing moves.
- `prefers-reduced-motion` is respected by default, with an in-game toggle. **Live now:** OS preference OR the pause-menu toggle. The toggle cannot turn OS reduced-motion off. Effects ask for the combined flag each time they play, so a change applies at once.
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
- The title screen states it is an **unofficial fan project** and is not affiliated with or endorsed by the show's rights holders or anyone in the cast. The game never uses a real person's name or likeness. **Live now:** the face shows the name, the first pitch line, a one-line fan-art credit, the disclaimer, the sound notice, Launch in its own box on the empty playfield, Civilian Run in a separate easy-run box, one control line, and one quote per visit. There is no timer on it. **How to fly** opens one step away as two tabs, Controls and How to play. How to play starts with the goal (fly the Viper, protect the fleet, destroy the resurrection ship), then the jump, the fleet, and the rest. A click outside the sheet closes it, and so do Back and Esc. **Credits** names Moriel Schottlender, moriel.tech, the source repository, and that the game is fan art inspired by Battlestar Galactica and the episode "33," with the same no-endorsement line. All of that copy lives in `title.json`.
- **Spoiler policy:** every line must make sense to someone who has only seen the first few episodes. No line implies that a specific named character is a Cylon. Gags about suspicion target the *player*. *Imaginary Six* is approved because her presence is established very early in the show, and the card text still stays vague.
- Humor targets the show's *quirks*, never the cast, the community, or real people. Avoid humor built on stereotypes.
- Community-contributed lines come in by pull request and go through the content checklist in AGENTS.md.
- This is not legal advice. Check with the community's moderators before launch, and consider whether a heads-up to the cast or their team is appropriate.

## 17. Privacy and data `[Core]`

**MVP collects no personal data.**

- No accounts, no free-text input, no cookies, no third-party scripts or fonts, no analytics.
- Local storage holds only: settings (volume, comms duration, reduced effects, readable font), best scores per tier, and the "seen" state for scenes and hints. It is versioned, validated when read, and treated as untrusted because a user can edit it.
- **Leaderboard (later):** no free-text names. Players get a **generated callsign** or pick from a curated list. That removes both privacy risk and moderation burden. Stored: callsign, score, tier, game version, timestamp. No accounts, so no personal data to delete. Server-side plausibility checks on scores. The leaderboard is for fun, not cheat-proof (see open questions).
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
| M6 | **Polish and launch** | share it | Accessibility pass, phone QA, the full settings screen (built on the storage seam from M5), logo (title copy and disclaimer are live), local best scores, deploy. |

**After MVP:** Vengeful, traits, Mandatory Firmware Update and loadout screen, remaining cards, more tiers, mutators, a seeded challenge and leaderboard, gamepad, PWA install.

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
| 9 | Seeds and a daily challenge | Every run is random. Seeds exist so tests can repeat a run; they promise nothing to players (ADR-0001 D3). A daily challenge or a "try my run" link is `[Later]` and would need a scenario discipline added back. |
| 10 | Analytics | None. |
| 11 | Languages | English. All text is data, so translation stays possible. |
| 12 | Community heads-up | The owner does this before going public. |
| 13 | Viper heading | Fixed heading toward the swarm side. It banks left and right, and does not rotate. |
| 14 | World orientation | A phone is 270 x 480. A wide window is 324 x 480. The fighters are one size on both (decided with the art, 2026-09-24). On a phone the column is the screen width, with strips above and below. From 1100 px wide the lane sits between the FLEET and COMMS consoles (12.6). |
| 15 | Civilian "assists" | Dropped. Civilian Ship just has easier numbers. |
| 16 | Visual construction | Hybrid: hand-drawn sprites for ships, and code and filters for the background and effects (ADR-0001, D4b). |
| 17 | A first-run tutorial | `[Later]`. A short lesson the first time someone launches, separate from Civilian Run. Civilian Run stays the same fight with an easier fleet, not that lesson. |

**Still open (ask before deciding):** the license, the leaderboard and seeded-challenge design, and PWA scope.

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
| 2026-09-22 | All twelve cards have a joke and advice from Baltar and Roslin, shown on the pick. Dealing the hand speaks one line about a card on that table. "Who are you talking to" and Recovering scenes still wait. | The card should say what it does, in both voices, without hiding the choice. |
| 2026-09-22 | Recovering plays a 2–4 beat scene for a clean, rough, or wrecked cycle, and the next cycle waits until that scene and the pick are both done. Once each time Imaginary Six appears, someone asks who the pilot is talking to. | The calm between jumps is a conversation, and the wingman is noticed. |
| 2026-09-22 | Comms now speaks on a fleet hit, a Raider's return, the factory's death and its 75/50/25 marks, a three-kill cluster, a close miss, low hull, and a 12-second kill drought. Spool is also called at 5 seconds and at 2. Heavy-Raider lines stay quiet. | The lines that were written can play, because the fight already has those moments. |
| 2026-09-22 | The title shows its written pitch, disclaimer, and one quote per visit. The Recovering scene sits at the top of that screen. | The words that were already written should be where a player reads them. |
| 2026-09-22 | The Viper silhouette is an original shallow crescent, wingtips hooked slightly forward. It is a similitude, not a traced show ship. | A wedge did not carry the ship people picture. |
| 2026-09-22 | The Viper on screen is the angular-wedge PNG, and a destroyed Raider plays the six-frame burst. Both are 64×64 pictures shown at 16×16. | The first pictures should be visible before the rest are drawn. |
| 2026-09-22 | The title face keeps the name, one pitch line, the quote, the sound choice, both launches, one control line, and the disclaimer. How to fly and Credits open one step off it. On a wide window the face flanks the portrait playfield. | A first visit was a thin column of every rule at once. The manual is there; the coin slot stays clear. |
| 2026-09-22 | The face names itself as fan art inspired by Battlestar Galactica. Credits also names the episode "33" and keeps the no-endorsement line. How to fly is two short tabs. Launch and the easy run sit in separate boxes. | The first face was still too much text, and the inspiration belonged where a player can find it. |
| 2026-09-22 | Launch sits on the empty playfield. How to play opens with the goal of the run. A click outside a title sheet closes it. The fleet score is a large readout above the playfield; comms sit under that score, in the same column on a phone and on a desktop, and do not cover it. The 33 is painted in the playfield behind the ships, with a hidden copy for assistive tech. A short first-run tutorial is something to look into later. Civilian Run is still not that tutorial. | Speeches were covering the score, and the countdown belonged with the fleet. |
| 2026-09-22 | Fleet health is a percentage with ten pips, on the same line as the comms. Launch says the fleet is in your hands. The debug readout floats in the desktop margin during development and in the test build, and is absent from a shipped build. | The health line was a scoreboard, and the debug text was sitting in the game. |
| 2026-09-23 | Raiders use the three eye frames, shown at 12×12. An armed Raider steps the eye; the others hold center. Player and aimed shots are 12×20 shown at 3×5. A stray is 12×28 shown at 3×7, so the longer trail is a cue besides the orange. | The next pictures should replace the rectangles before more are drawn. |
| 2026-09-23 | Portraits are drawn at 64×64 and shown at 64 CSS pixels. A later UI pass (12.6) may put the line under the playfield on a narrow window and a phone, with the fleet percentage at one end and the portrait and bubble at the other, and may show that same file at about 128 CSS pixels in the side margins on a large screen. The line still sits above the playfield until that pass. | One 64×64 drawing is the face to produce now. A desktop wants a bigger face, and that layout is a later look. |
| 2026-09-23 | Comms shows the 64×64 portraits: closed, open, and blink on the game clock, two changes a second. Reduced effects holds closed. Signature uses the closed file until those drawings exist. The line still sits above the playfield. | The faces are drawn. The signature pose and the bottom strip can wait. |
| 2026-09-23 | The line and its portrait sit in a fixed-height band under the playfield, so a longer line does not resize the playfield. Mute stays above. Pause and About sit with it. About pauses and opens how to play and what the game is. On a phone the column is the screen width. When that top band is narrow, Mute, Pause, and About fold under Settings. Missile and Speech sit on the playfield, not under the dialogue. | The dialogue was shoving the playfield around, and on a phone the column had gone thin with buttons left behind the strip. |
| 2026-09-23 | A wide window plays a 324-wide lane. The Viper and the Raiders are a quarter larger there, pictures and hitboxes. The fleet and the shots stay the phone size. The same seed is the same scenario on the same playfield. A shared result carries the run's numbers, not a replay. | The fighters were about 28 pixels on a monitor. A phone and a desktop do not have to play the same lane. |
| 2026-09-23 | Recovering is a sheet of three titles. Opening a title shows the effect, the joke, and Baltar and Roslin. Apply starts the next cycle immediately and ends the scene if it is still speaking. The reroll button says Refresh the list. The newest bonus name sits between fleet health and mute. | The old table showed every line at once, and a tap only held a choice until the scene finished, so a second tap could change it. |
| 2026-09-23 | A closed Recovering row shows the name and the joke. The effect and the two advisors stay behind the row. Apply counts 3-2-1 before the next cycle. The pause menu does not cover that sheet, including Esc and the Pause button. Mute stays. | The joke is the line you choose from. The countdown is time to get back to the keyboard. The sheet was already a wait, so a second menu on top of it was in the way. |
| 2026-09-24 | The eject marker is a placeholder parachute that drifts in one slow arc until pickup. Reduced effects holds it still. The download card still never shows it. | A seat of three bars did not read as an eject, and a still mark did not show the wait. |
| 2026-09-24 | The mute button and the title's sound notice are off the screen until something can play. The `muted` setting and `MuteControl` stay. | A Sound on button with no sound was a control for a feature that is not in the game yet. |
| 2026-09-24 | Decided after a full review, not built yet (ADR-0002): the countdown may leave the playfield as long as it stays visible while playing (changes 5.1 when built). A score and a run summary are in (feeds 17's share link). The swarm grows on a middle path, ramping across cycles while download / refill stays the rule (changes 9 when built). The heavy Raider comes with a cap on how many are on the field. The text half of every colour tell must reach the shipped HUD, not only the debug readout. Proposed, not decided: drop "same seed, same scenario" (decision 9). | A release build showed two Raiders, an empty desktop, and tells that only existed in the development readout. |
| 2026-09-24 | Every run draws a fresh random seed. "Same seed, same scenario" and the daily seed are dropped; seeds exist for tests. A daily challenge or "try my run" link stays `[Later]` (decision 9). | Every run was seed 1, and a shared scenario would tax every future random feature for a challenge nobody asked for. |
| 2026-09-24 | The countdown leaves the playfield for the top band beside fleet health. A status row names hull, the loop, the ship, escorts, and Six in words in the shipped HUD, and an objective line says what the run wants. Missile and Speech are touch-only and flank the comms strip. VT323 and Atkinson Hyperlegible are self-hosted, with a remembered Readable font toggle. Reduced effects applies without a reload. | The review found the clock under the Viper, the buttons over the fleet, and the text tells only in the development readout (ADR-0002 Phase 1). |
| 2026-09-24 | The CIC layout mock-up is approved (ADR-0002 2.1). Civilian ships get names: nine drawn per run from an owner-written pool in `content/fleet.json`, Galactica always present. Card art is a 112 × 36 banner. Whole-number scaling, one fighter size, and scanlines are deferred to Phase 4 and after. | The FLEET console lists the ships, so they need names; a pool keeps runs varied. |
| 2026-09-24 | The CIC shell: from 1100 px wide the lane sits between a FLEET console (health, FTL ring, named ships, objective) and a COMMS console (128 px portrait, recent log, loadout, missile and Speech readouts, Pause and About), on the title too. A laptop folds the ship list, log, and loadout. The pause menu keeps a 20-line comms log. On a phone the objective joins the status row. Apply and Continue also silence any line waiting under the Recovering scene. | Approved mock-up (ADR-0002 2.1). The stale line was a card-advice line about the closed hand surfacing in the next cycle. |
| 2026-09-24 | The Recovering pick is three cards (ADR-0002 2.3): rarity as a word and a frame, the stack it would become, an art banner, the joke, and the effect with both advisors. A wide window shows a full-screen board with everything at once; a phone stacks the cards and opens one at a time, with Apply pinned in reach. | The approved mock-up; the pick should feel like a reward, not a settings list. |
| 2026-09-24 | The Director gets a floor as well as a cap, both per cycle: below the floor, fresh Raiders come even while downloads are pending, and a finished download waits for a free slot rather than pass the cap. Downloads are staggered by a per-tier jitter. The resurrection ship's death tops the swarm up to the cap once (the last wave). | Owner: "always about 3 to 5 on screen"; the simulator showed 0.6 on screen for a pilot chasing kills. |
| 2026-09-24 | Raiders dive straight, and a per-cycle share weaves a shallow sine (18 wu, 2.6 s) inside the lane. | Owner: "straight dive, and occasional shallow sine". |
| 2026-09-24 | The heavy Raider: its own queue, never downloads, 8 hull, slower, a missile does 3, its own attack token, at most `heavyMax` alive from `heavyFromCycle`. | MVP scope had one heavy; owner: "own queue, one or two on screen, from about cycle 2." |
| 2026-09-24 | First swarm tuning, same on both tiers: cap 3 → 6, floor 3 → 5, attack tokens 1 → 3, strafe tokens 1 → 2, weavers 10% → 35%, jitter ±1.5 s, two heavies per cycle from cycle 2 (at most two alive). Simulator: about 4.5 Raiders on screen (was 0.6); Viper Pilot now loses an idle pilot's run; Civilian Run still never loses. | A starting point for the playtest, not a final balance. Numbers in `src/balance/tiers.json`. |
| 2026-09-24 | Raiders fly at 46 wu/s (was 55), heavies at 30 (was 35). Their shots keep their speed. | First playtest of the full swarm: challenging, but the Cylons felt a bit too fast. The simulator shows no change in outcomes, so this is feel, not balance. |
| 2026-09-24 | Hit feedback: sparks where a round strikes, a 2-pixel knock on the hit Raider, a ripple when the shield takes a round, a bigger burst for a heavy. No hit-stop. Reduced effects shows a still spark. | Comfort-safe game feel (ADR-0002 3.4); hits that do not kill were silent. |
| 2026-09-24 | Art scale: the canvas draws two pixels per world unit. Viper 32 wu (was 16), Raider 24 (was 12), heavy 36. Hitboxes: Viper 8 (was 6), Raider 10 (was 8), heavy 15 (was 12). One fighter size on a phone and a wide window (the desktop quarter boost is gone). Simulator: hunter wins 92% on Viper Pilot (was 82%), an idle pilot loses 40% (was 65%). | Owner: the Viper looked incredibly small. Bigger ships are easier to hit; the playtest decides whether to take some of that back. |
