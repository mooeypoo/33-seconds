# ADR-0002: Review follow-up roadmap

**Status:** Accepted, 2026-09-24. D1 (seeds) accepted by the owner on 2026-09-24 after comparing it with keeping the promise.
**Deciders:** Moriel (owner)
**Related:** [ADR-0001](0001-architecture.md), [PRD](../PRD.md),
[gameplay review](../review/2026-09-24-gameplay.md), [UI and UX review](../review/2026-09-24-ui-ux.md),
[art scale](../art/ART-SCALE.md)

---

## How to pick this up

Read this section at the start of any conversation that continues the review work.

1. Find the first phase below that is not done. Its checklist says what is left.
2. Phases run in order. Phase 0 is architecture only and changes nothing a player can see.
3. Each phase is one pull request or a short series of them. Stop between phases for the owner to
   play the result and answer anything listed under "Ask first."
4. Tick the box and add the date when an item lands. When a phase is done, say so in its heading.
5. The gameplay and UI/UX reviews are the background for phases 1 to 5. Their "Brainstorm" lists
   are open questions, not decisions. Settle them in chat before building, then record the answer
   where it belongs (PRD for rules, an ADR for architecture).

## Context

On 2026-09-24 the whole repository was reviewed: code, PRD, ADR-0001, journal, and screenshots of
the release build on a 1440×900 desktop, a 1280×720 laptop, and a Pixel 7. All gates were green
(typecheck, lint, 200 tests, architecture check). The review found three kinds of problem:

- **Architecture debt** that will make the next features harder: the HUD reads the renderer's debug
  struct, one class owns the whole simulation, presenters read domain constants instead of views,
  and a bug has already come from that last one. Detail in Phase 0.
- **Gameplay** that is thinner than the PRD's pitch: two Raiders on screen, one shooting, no sound,
  no score. See the [gameplay review](../review/2026-09-24-gameplay.md).
- **UI and UX** that treat the desktop as a phone and mix pixel densities. See the
  [UI and UX review](../review/2026-09-24-ui-ux.md).

## Owner decisions (2026-09-24)

| # | Question | Decision |
|---|---|---|
| 1 | Hordes or a few readable threats? | **Middle path.** More Raiders, ramping across cycles, without becoming frustrating, and download / refill stays the rule while the resurrection ship lives. Designed in the gameplay phase, not before. |
| 2 | May the countdown leave the playfield? | **Yes.** It must stay visible while playing, but it does not have to be inside the play area. |
| 3 | Redraw sprites at native size? | **Yes, the owner redraws.** Sizes are in [SPRITE-FILES.md](../art/SPRITE-FILES.md) (revised 2026-09-24: two art pixels per world unit, see [ART-SCALE.md](../art/ART-SCALE.md)). |
| 4 | Score and a run summary? | **Yes.** |
| 5 | Heavy Raider? | **Yes, with a cap** on how many are on the field so it does not make the game too hard. |
| 6 | Pixel font (OFL file) and ZzFX? | **Approved.** Recorded in AGENTS.md. |
| 7 | Text tells that only exist in the debug readout | **A bug**, fixed in Phase 1. |

## Decisions

### D1. Seeds: random per run, seedable for tests (accepted)

**Proposal:** drop the promise that the same seed gives the same scenario, and drop the daily seed.
Keep randomness injected into the domain.

What stays:
- `Math.random` stays banned in `src/domain`. The domain takes a random stream from outside, so
  tests and the simulation harness can pin a seed and get a repeatable run.
- Cosmetic and banter randomness stays on its own stream. The reason changes: it is no longer about
  a fair shared scenario, it is so that adding a joke never changes what a gameplay test sees.
- A shared result carries the run's numbers (score, cycles, kills, cards, how it ended). It never
  needed a seed and never promised a replay.

What goes:
- "Same seed, same scenario" in ADR-0001 D3, PRD decision 9 and decision 14, and the D10
  leaderboard plan's reliance on it.
- The per-cycle stream derivation (`runSeed + cycleIndex`) and the rule that RNG consumption order
  must stay stable across versions.
- Rules like "no roll when the chance is 0, so a run without the card does not spend scenario RNG."
  They may stay in code, but they are no longer requirements.

What changes at runtime: today nothing passes a seed, so **every run uses seed 1**. The same
kills lead to the same spawn columns, the same card offers, and the same jokes. Under this proposal
the composition root picks a fresh seed per run (from `crypto.getRandomValues`, outside the domain).

**Why:** the game is waves plus jokes under fixed rules. A shared scenario adds a hidden, ongoing
cost (every change to how randomness is consumed changes "the scenario") for a feature nobody has
asked for. Without it, horde and spawn design can use randomness freely.

**What we give up:** a daily challenge or a seed-fair leaderboard later would need stream discipline
to come back. At this size that is a few days of work, and it would need a version stamp anyway,
because any balance change breaks old seeds.

**Accepted 2026-09-24.** Built in Phase 0.9 through a `SeedSource` port. ADR-0001 D3 is rewritten to match. The two existing gameplay streams (scenario, and the resurrection ship's station-keeping) stay as they are: merging them would reshuffle every seeded test for no player benefit.

### D2. The HUD reads an application view model, not the renderer

`GameScene.publishStats` builds `FrameStats` (a debug struct) every 250 ms, and Vue reads that for
the HUD, the buttons, and the cycle phase. The same struct is the end-to-end tests' window.
**Decision:** the application layer derives a `HudViewModel` from `GameView` and `SessionStatus`
each frame and publishes it through the session. Vue reads only that. `FrameStats` shrinks back to
render facts (fps, scale) plus the debug readout the end-to-end tests use.

### D3. Presenters read views and events, not domain constants

The ghost bar computes progress from `RESURRECTION_DOWNLOAD_SECONDS`, so with *Your Call Is
Important to Us* it sits empty for the first two seconds instead of showing a longer wait. **Decision:** anything a presenter
draws that depends on a rule comes from the view (for example `GhostView.progress`,
`ViperView.hpMax`). Presenters may still import pure geometry that never varies (world height, the
fleet line).

### D4. `Game` is an orchestrator, and rules live in domain services

`Game` is 1,174 lines, and the kill sequence is copied three times (gun, missile, Imaginary Six).
**Decision:** extract `destroyRaider` first, then move the swarm and Director, hit resolution, and
the resurrection queue into their own domain modules. `Game.tick` keeps the order of operations and
nothing else. `GameSession` likewise hands comms work to a `CommsDirector` in `application/banter`.

### D5. Pull requests follow the phases

One PR for this documentation, then at least one PR per phase. Phase 0 may be two PRs if the
`Game` split is large. The owner opens and merges them (AGENTS.md).

## Phases

### Phase 0: Architecture groundwork (no visible change) — done 2026-09-24

- [x] **0.1** (2026-09-24) Ghost bar reads progress from the view. Failing test first: with *Your Call Is
  Important to Us*, a fresh ghost shows 0 progress and fills evenly over 8 s.
- [x] **0.2** (2026-09-24) `destroyRaider(raider, events)` replaces the three copies in `game.ts`.
- [x] **0.3** (2026-09-24) `HudViewModel` in the application layer (D2). Vue reads it. `FrameStats` becomes
  render and debug only. The end-to-end tests keep working. The session publishes it every frame;
  the store copies it field by field so only changed values re-render. The debug readout's game
  facts come from `debugFacts(view)`, so the renderer adds only fps and scale.
- [x] **0.4** (2026-09-24) Presenters stop reading rule constants (D3): download seconds, hull max, anything
  else the audit finds. Found and moved to views: Viper, Raider, and Raptor full hull; eject
  progress (the chute no longer counts ticks against a constant); top speed after cards (bank
  frames); Galactica by flag, not index. Drawing sizes stay imported, as D3 allows.
- [x] **0.5** (2026-09-24) `Game.view` is built once per tick and reused, including the missile lock.
- [x] **0.6** (2026-09-24) Split `Game` into domain services (D4). Behavior-preserving: the existing tests
  are the proof. `swarm/Swarm.ts` (live Raiders, download queue, Director, tokens, the kill),
  `combat/Munitions.ts` (shot and missile pools), and `combat/hits.ts` (gun, missile, Cylon rounds,
  fleet line, Raptor soak, flak, Six's beam) over a typed `Battlefield`. `game.ts` went from 1,164
  to 628 lines and keeps the tick order, firing, the missile lock, the ship's arrival, win and loss,
  and the view. The 205 tests passed unchanged; five guardrail anchors moved with the code.
- [x] **0.7** (2026-09-24) `CommsDirector` takes banter, cues, scenes, and the Six remark out of `GameSession`.
  `GameSession` went from 432 to 339 lines.
- [x] **0.8** (2026-09-24) Content validation (ADR-0001 D8): a `check:content` script for unknown speakers,
  duplicate ids, length limits, and placeholders that do not exist. Runs in CI. It reuses the
  game's own loaders and names every line or scene they would drop, plus markup, emoji, unknown
  cards, and flair coverage. Four new guardrail sabotages prove it fails.
- [x] **0.9** (2026-09-24) Random streams per D1: a fresh seed per run through a `SeedSource` port, docs aligned.
  `crypto` in the browser, a pinned seed in tests. ADR-0001 D3 and PRD decision 9 rewritten.


### Phase 1: Quick UX wins — done 2026-09-24

Detail in the [UI and UX review](../review/2026-09-24-ui-ux.md), section "Phase 1."

- [x] **1.1** (2026-09-24) Design tokens: CSS custom properties for palette, spacing, and type, replacing the
  hard-coded hex colours in the Vue files. 140 raw values replaced in `src/presentation/styles.css`
  tokens; exact colours kept, so the step changed nothing on screen. Older components keep their own
  spacing numbers; new ones use the scale.
- [x] **1.2** (2026-09-24) Self-hosted pixel font plus the readable-font toggle (PRD 14). VT323 (owner's pick)
  for labels, headings, numbers; Atkinson Hyperlegible for sentences. `font-size-adjust` evens out
  VT323's small x-height, and `font-synthesis: none` stops faked bold and italic. The toggle is a
  new remembered setting (`readableFont`, additive to the v1 envelope).
- [x] **1.3** (2026-09-24) The text tells reach the shipped HUD: loop / offline, bays / sealed, ejected, hull,
  two transponders, Raptor, Six (decision 7). A `StatusRow` under fleet health; alerts also get a
  thicker amber edge.
- [x] **1.4** (2026-09-24) The Missile and Speech buttons show only on touch, and never cover the fleet.
  They flank the comms strip (owner's pick), and stay in place, disabled, between cycles.
- [x] **1.5** (2026-09-24) The countdown moves out of the playfield into the HUD, still visible while
  playing (decision 2). PRD 5.1 changes with it. Top band beside fleet health (owner's pick), with a
  bar across the cycle that turns amber for the spool. `ClockPresenter` is gone.
- [x] **1.6** (2026-09-24) An objective line that changes with the stage of the run. Stages derived in
  `HudViewModel`; words in `content/hud.json`.
- [x] **1.7** (2026-09-24) The reduced-effects toggle applies without a reload. Presenters take a
  `ReducedEffectsSource` and ask it each time an effect plays.

### Phase 2: CIC layout — done 2026-09-24

- [x] **2.1** (2026-09-24) Mock-up for the owner to react to, before any code. A private design canvas,
  https://claude.ai/artifact/LPd1nbt8VeMCCeMkuwS9ks (desktop, laptop, phone, title, card pick).
  Approved as drawn. Owner decisions:
  - The three-panel CIC shell (FLEET · DRADIS · COMMS) is the direction.
  - Laptop collapse order: the ship list becomes one line, the log moves to the pause menu, the
    loadout shows the newest card and a count.
  - Card art is a 112 × 36 banner, shown 3× on desktop and laptop, 2× on a phone. Every picture the
    game needs is now one checklist in `docs/art/SPRITE-FILES.md`.
  - Civilian ship names: nine drawn per run from a pool in `src/content/fleet.json` that the owner
    writes; Galactica always present. Rule in PRD 7.4, format in CONTENT-SCHEMA.
- [x] **2.2** (2026-09-24) Desktop consoles in the side margins, phone strips, one shell for title and run.
  PR 2a. `FleetConsole` (health, `JumpRing`, the named ship list from `fleetRoster`, objective) and
  `CommsConsole` (128 px portrait, recent log, loadout, readouts, Pause and About) from 1100 px wide
  (`useCicLayout`); the laptop collapse is CSS at under 1360 × 820. The lane element never changes,
  because Phaser mounts into it once. The title stands the consoles by and sits in the lane. The
  pause-menu comms log (PRD 12.2) came into this PR, because the laptop collapse points at it. Found
  on the way: a card-advice line waiting under the Recovering scene surfaced in the next cycle;
  `CommsDirector.endRecovering` now silences it.
- [x] **2.3** (2026-09-24) Upgrade picks become cards (rarity, stacks, icon). PR 2b. Card art slots per SPRITE-FILES.
  `UpgradeCard` over `offerCards(view)` (rarity, owned, cap). Wide: a full-screen board, every detail
  showing, cards as tall as their words. Phone: stacked, one open at a time, Refresh and Apply
  sticky, and the action buttons step aside so the scene has the strip. Art is picked up from
  `assets/cards/<id>.png` as files land.

Ask first: the brainstorm items in the UI and UX review.

### Phase 3: Fun pass — done 2026-09-24

- [x] **3.1** (2026-09-24) Balance simulation harness (ADR-0001 D13, `tools/sim/`), before any retuning.
  PR 3a. `npm run sim` prints win/loss, run length, fleet low, Raiders on screen, and ejects for each
  tier against three bots (idle, hunter, guard). Tier numbers moved to `src/balance/tiers.json`
  (validated, with per-cycle ramps for the Director cap and tokens), unchanged in value. Three
  property tests in `npm test` run through the harness. Baseline in the gameplay review.
- [x] **3.2** (2026-09-24) Middle-path swarm: ramping cap and tokens, movement patterns (decision 1).
  PR 3b/3c (stacked commits). A Director floor as well as a cap, staggered downloads, the last-wave
  top-up, and a share of shallow-sine weavers, all per cycle in `tiers.json`. Tuned with the
  simulator: about 4.5 Raiders on screen, up from 0.6. Before/after in the gameplay review.
- [x] **3.3** (2026-09-24) Heavy Raider with a field cap (decision 5). Same PR. Its own queue, never
  downloads, 8 hull, a missile does 3, its own attack token; two per cycle from cycle 2, at most two
  alive. Placeholder is the Raider picture at 1.7× until `raider_heavy` is drawn.
- [x] **3.4** (2026-09-24) Comfort-safe hit feedback: hit-stop, knockback, sparks. New domain facts for
  hits that do not kill (`RaiderHit`, `ViperHit`, `ResurrectionShipHit` with `shielded`), which audio
  will reuse. `ImpactPresenter` (sparks, shield ripple), a 2-pixel cosmetic knock on the Raider, and a
  larger burst for a heavy. **No global hit-stop:** with auto-fire and four to six targets, kills come
  about once a second, and a freeze each time would stutter the game. Reduced effects: a still spark.
- [x] **3.5** (2026-09-24) Audio: `AudioPort`, the cue catalog (ADR-0001 D4), ZzFX effects, mute back in
  the HUD (PRD 14.1). PR 3e. The cue table and limits live in `AudioDirector` (application), not in
  the Phaser cue catalog, because sound is not a Phaser concern here (ADR-0001 D12). Placeholder
  sounds for every id; auto-fire silent. Mute on the title, HUD, and pause menu, plus a master
  volume. A dev-only sound test page at `/tools/sound-test/`.

Ask first: the brainstorm items in the gameplay review.

### Phase 4: Art at scale

Decided 2026-09-24, pulled forward: **two art pixels per world unit, one fighter size everywhere**
(`docs/art/ART-SCALE.md`). The Viper spans 32 world units (its 64 × 64 file), the Raider 24 (48 × 48).
The desktop's 1.25 fighter boost goes away. The owner's Viper, Raider, and small explosion already
fit; what is left to draw is the checklist in `docs/art/SPRITE-FILES.md`.

- [x] **4.0** (2026-09-24) Render at two pixels per world unit (a Phaser camera zoom of 2 over a
  canvas twice the world; the domain is unchanged), the new ship sizes with the existing art, one
  fighter size, retuned hitboxes (Viper 8, Raider 10, heavy 15), and a simulator check. PR 4a.
- [ ] **4.1** The owner's remaining sprites (shots, heavy, resurrection ship, fleet, effects) as they
  land (decision 3).
- [ ] **4.2** Starfield, Galactica silhouette, fleet sprites, Dradis sweep.

### Phase 5: Explain the loop, reward a replay

- [ ] **5.1** Ghost-to-ship tell, returned tallies, first-run lesson cycle.
- [ ] **5.2** Score, run summary with the joke stats, share link (decision 4, PRD 17).

### Phase 6: Launch readiness

- [ ] **6.1** Tailored Phaser build under the 300 KB budget (release build measured at 427 KB
  gzipped on 2026-09-24).
- [ ] **6.2** Real-phone gates (ADR-0001 D4), deploy preview check.

## Deferred (look at these again)

Decided not to do yet, on purpose. Each names the phase that picks it up.

- ~~Whole-number pixel scaling~~ and ~~one fighter size~~ (UI review brainstorms 1 and 2): decided
  2026-09-24 and moved into Phase 4 (4.0). Two art pixels per world unit, stretched to fit; one size.
- **Scanlines and CRT** (UI review brainstorm 8, PRD 14): after Phase 4. They need a reduced-effects
  version, and the layout does not depend on them.

## Open, to discuss when convenient

- CONTENT-SCHEMA 5 says `check:content` "fails a scene that would run longer" than 12 seconds.
  PRD 12.3 (newer) says the beats shrink together so the scene still finishes, and the code does
  that. The check follows the PRD and does not fail long scenes. Owner to confirm, then align the
  schema.

- The PRD has become part changelog: its "Live now" paragraphs repeat the changelog and bury the
  rules. Suggestion: move them to a short status file and keep the PRD to rules.
- The leaderboard ADR that ADR-0001 action item 7 calls "ADR-0002" will take the next free number.
