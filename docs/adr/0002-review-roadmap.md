# ADR-0002: Review follow-up roadmap

**Status:** Accepted (plan), 2026-09-24. D1 (seeds) is **proposed**, waiting for the owner.
**Deciders:** Moriel (owner)
**Related:** [ADR-0001](0001-architecture.md), [PRD](../PRD.md),
[gameplay review](../review/2026-09-24-gameplay.md), [UI and UX review](../review/2026-09-24-ui-ux.md),
[native-scale redraw](../art/NATIVE-SCALE-REDRAW.md)

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
| 3 | Redraw sprites at native size? | **Yes, the owner redraws.** Sizes are in [NATIVE-SCALE-REDRAW.md](../art/NATIVE-SCALE-REDRAW.md). |
| 4 | Score and a run summary? | **Yes.** |
| 5 | Heavy Raider? | **Yes, with a cap** on how many are on the field so it does not make the game too hard. |
| 6 | Pixel font (OFL file) and ZzFX? | **Approved.** Recorded in AGENTS.md. |
| 7 | Text tells that only exist in the debug readout | **A bug**, fixed in Phase 1. |

## Decisions

### D1. Seeds: random per run, seedable for tests (proposed)

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

**Owner to confirm.** Until then, Phase 0 does not touch the random streams.

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

### Phase 0: Architecture groundwork (no visible change)

- [ ] **0.1** Ghost bar reads progress from the view. Failing test first: with *Your Call Is
  Important to Us*, a fresh ghost shows 0 progress and fills evenly over 8 s.
- [ ] **0.2** `destroyRaider(raider, events)` replaces the three copies in `game.ts`.
- [ ] **0.3** `HudViewModel` in the application layer (D2). Vue reads it. `FrameStats` becomes
  render and debug only. The end-to-end tests keep working.
- [ ] **0.4** Presenters stop reading rule constants (D3): download seconds, hull max, anything
  else the audit finds.
- [ ] **0.5** `Game.view` is built once per tick and reused, including the missile lock.
- [ ] **0.6** Split `Game` into domain services (D4). Behavior-preserving: the existing tests
  are the proof.
- [ ] **0.7** `CommsDirector` takes banter, cues, scenes, and the Six remark out of `GameSession`.
- [ ] **0.8** Content validation (ADR-0001 D8): a `check:content` script for unknown speakers,
  duplicate ids, length limits, and placeholders that do not exist. Runs in CI.
- [ ] **0.9** Random streams per D1, once the owner confirms it.

Ask first: D1.

### Phase 1: Quick UX wins

Detail in the [UI and UX review](../review/2026-09-24-ui-ux.md), section "Phase 1."

- [ ] **1.1** Design tokens: CSS custom properties for palette, spacing, and type, replacing the
  hard-coded hex colours in the Vue files.
- [ ] **1.2** Self-hosted pixel font plus the readable-font toggle (PRD 14).
- [ ] **1.3** The text tells reach the shipped HUD: loop / offline, bays / sealed, ejected, hull,
  two transponders, Raptor, Six (decision 7).
- [ ] **1.4** The Missile and Speech buttons show only on touch, and never cover the fleet.
- [ ] **1.5** The countdown moves out of the playfield into the HUD, still visible while
  playing (decision 2). PRD 5.1 changes with it.
- [ ] **1.6** An objective line that changes with the stage of the run.
- [ ] **1.7** The reduced-effects toggle applies without a reload.

### Phase 2: CIC layout

- [ ] **2.1** Mock-up for the owner to react to, before any code.
- [ ] **2.2** Desktop consoles in the side margins, phone strips, one shell for title and run.
- [ ] **2.3** Upgrade picks become cards (rarity, stacks, icon).

Ask first: the brainstorm items in the UI and UX review.

### Phase 3: Fun pass

- [ ] **3.1** Balance simulation harness (ADR-0001 D13, `tools/sim/`), before any retuning.
- [ ] **3.2** Middle-path swarm: ramping cap and tokens, movement patterns (decision 1).
- [ ] **3.3** Heavy Raider with a field cap (decision 5).
- [ ] **3.4** Comfort-safe hit feedback: hit-stop, knockback, sparks.
- [ ] **3.5** Audio: `AudioPort`, the cue catalog (ADR-0001 D4), ZzFX effects, mute back in
  the HUD (PRD 14.1).

Ask first: the brainstorm items in the gameplay review.

### Phase 4: Art at native scale

- [ ] **4.1** The owner's redrawn sprites, shown at 1:1 (decision 3).
- [ ] **4.2** Starfield, Galactica silhouette, fleet sprites, Dradis sweep.

### Phase 5: Explain the loop, reward a replay

- [ ] **5.1** Ghost-to-ship tell, returned tallies, first-run lesson cycle.
- [ ] **5.2** Score, run summary with the joke stats, share link (decision 4, PRD 17).

### Phase 6: Launch readiness

- [ ] **6.1** Tailored Phaser build under the 300 KB budget (release build measured at 427 KB
  gzipped on 2026-09-24).
- [ ] **6.2** Real-phone gates (ADR-0001 D4), deploy preview check.

## Open, to discuss when convenient

- The PRD has become part changelog: its "Live now" paragraphs repeat the changelog and bury the
  rules. Suggestion: move them to a short status file and keep the PRD to rules.
- The leaderboard ADR that ADR-0001 action item 7 calls "ADR-0002" will take the next free number.
