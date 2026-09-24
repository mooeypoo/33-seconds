# ADR-0001: Architecture for 33 Seconds

**Status:** Accepted. D4 (Phaser 4) is confirmed for bundle size, CSP compatibility, and pause control
by a measured spike on 2026-09-20 (see `docs/journal/0001-something-moves.md`). The on-device gates in
D4 (sustained frame rate, integer scaling, iOS audio, 2D lighting cost) are still open and need a real
phone.
**Date:** 2026-09-19 (last revised 2026-09-20)
**Deciders:** Moriel (owner)
**Related:** [PRD](../PRD.md), [AGENTS.md](../../AGENTS.md), [ADR-0002: review follow-up roadmap](0002-review-roadmap.md)

---

## Guidelines at a glance

Read this section every session. The rest of the document explains and details.

1. **Layers:** `presentation` and `infrastructure` depend on `application`, which depends on `domain`. The domain imports nothing else. (D1)
2. **`src/domain` is pure TypeScript:** the game rules plus the state rules read. No Phaser, Vue, DOM, timers, `Math.random`, or `Date`. (D1)
3. **Time and randomness:** fixed 1/60 s ticks, where `tick(intent)` returns events. Randomness is injected and seeded, with separate streams for gameplay and for jokes and cosmetics. (D2, D3)
4. **Stack:** TypeScript strict, Vue 3 overlay (menus, HUD, comms, pause), Phaser 4 canvas, Vite, Vitest, Playwright, Netlify static. (D4, D5, D11)
5. **Phaser is an external system.** Import it only under `src/infrastructure/phaser/`, with one presenter per domain area and one cue table. It is never the source of truth for a rule. (D4)
6. **Input** becomes one `InputIntent`. Listeners live on the game root, and overlays are `pointer-events: none` unless they are real controls (`data-ui`). (D6)
7. **Pause** is an application concern, and everything time-based uses the game clock. Auto-pause on a hidden tab. (D7)
8. **Data, not code:** jokes and card flavor are JSON, tuning numbers live in one typed tier profile, and knobs are few. (D8, D9)
9. **Storage** is local-only, versioned, validated, and untrusted. No personal data. Strict CSP. (D10, D11)
10. **Tests** are heavy on the domain and sharp, never filler, with a few end-to-end flows. (D13)
11. **Keep it simple:** plain arrays and pooling first, and optimize only after measuring. (D13)
12. **Record architecture changes here** by editing or adding a decision, and raise concerns instead of guessing.

---

## Context

We are building a small browser game: a pixel-art, survivors-style shooter played on desktop and phone, with a 33-second cycle, resurrecting enemies, a persistent boss, a data-driven comedy layer, and later an optional leaderboard.

Forces at play:

- **Maintainability by one human.** The code must be readable and tweakable by a single engineer who did not write it. Clean separation of concerns matters more than cleverness.
- **Domain-Driven Design.** The rules of the game (resurrection, fleet damage, the jump cycle) are the valuable part and must not be entangled with rendering, the DOM, or Vue.
- **Mobile and desktop.** Input differs a lot (keyboard versus a floating drag stick), and performance budgets are tight on phones.
- **Comfort and accessibility** are hard requirements, not polish.
- **Security and privacy come first** for anything that touches storage or a server, even in a hobby project, because the audience may include minors and because localStorage and client-submitted scores are untrusted.
- **Hosting:** static site on Netlify, with optional Netlify Functions later.
- **Comedy content changes often** and may come from community pull requests, so it must not live in game logic.

## Decision

A four-layer architecture with an enforced one-way dependency rule, a pure-TypeScript domain driven by a fixed-timestep tick, Phaser 4 as the presentation and I/O platform behind an anti-corruption layer (validated by the platform check), Vue 3 for menus, HUD, and comms overlays, and content and balance held as typed data.

```
src/
  domain/          # pure TS. No DOM, no Vue, no rendering engine, no timers, no Math.random
    shared/        # ids, seeded RNG, value objects, event types
    cycle/         # JumpCycle state machine, Director (waves, caps, attack tokens)
    swarm/         # Raiders, ghosts, attack tokens, returned marker
    resurrection/  # download queue, resurrection ship (persistent HP)
    fleet/         # Fleet aggregate: integrity, damage cap, repair
    combat/        # Viper, projectiles, missiles, targeting policies, collisions
    progression/   # upgrades as modifiers, offers, specials
  application/     # orchestrates the domain. No DOM.
    ports/         # InputPort, AudioPort, StoragePort, LeaderboardPort (presentation uses presenters and read-only views, see D4)
    GameSession.ts # Title / Running / Paused / GameOver, fixed-step accumulator
    banter/        # events -> comms messages (own bounded context)
  infrastructure/  # adapters for the outside world
    phaser/  (presenters by bounded context)   input/   audio/   storage/   leaderboard/
  presentation/    # Vue 3: screens, HUD, comms overlay, pause menu, settings
  content/         # JSON: banter, scenes, upgrade flair, portraits map
  balance/         # typed tuning: tier profiles
netlify/functions/ # later: leaderboard
tools/             # balance simulation harness, content validation
```

**Dependency rule:** `presentation -> application -> domain`, and `infrastructure -> application (ports) -> domain`. The domain imports nothing from the other layers. Application depends on port *interfaces*, and infrastructure implements them. This is enforced by tooling (D1), not by convention.

### Bounded contexts

| Context | Kind | Lives in |
|---|---|---|
| Combat and Swarm | Core | `domain/combat`, `domain/swarm` |
| Cycle and Director | Core | `domain/cycle` |
| Resurrection | Core | `domain/resurrection` |
| Fleet | Core | `domain/fleet` |
| Progression | Core | `domain/progression` |
| Banter (comms) | Supporting | `application/banter` + `content/` |
| Presentation | Generic | `presentation/`, `infrastructure/phaser` |

### Domain events (past tense, facts)

`RaiderDestroyed`, `RaiderResurrected`, `ResurrectionShipExposed`, `ResurrectionShipDamaged`, `ResurrectionShipDestroyed`, `WaveCleared`, `CycleStarted`, `FtlSpoolStarted`, `FleetJumped`, `FleetDamaged { cause: 'strafe' | 'stray' }`, `FleetRepaired`, `FleetLost`, `MissileLaunched`, `MissileIntercepted`, `MissileDetonated`, `ViperDestroyed`, `UpgradeOffered`, `UpgradeChosen`.

The domain does not know that screen effects, audio, or jokes exist. Presentation and Banter subscribe to events.

---

## Decisions in detail

### D1. Layers and an enforced dependency rule

**Decision:** Four layers as above. Enforce with `dependency-cruiser` (or an ESLint boundaries plugin) in CI, plus lint rules that ban `Math.random`, `Date`, `setTimeout`, `setInterval`, `window`, and `document` inside `src/domain`.

**Why:** DDD separation that depends on discipline erodes the first time someone is in a hurry. A failing build does not.

**Alternatives:** convention only (rejected: erodes); one flat `src/` (rejected: exactly what we are avoiding).

**Consequence:** a little ceremony (ports and adapters) in exchange for a domain that runs in Node, in tests, and in a balance simulator.

### D2. Simulation model: fixed timestep, one entry point, events out

**Decision:**
- The domain advances in **fixed 1/60 s ticks**. `game.tick(intent)` is the only mutating entry point and returns the events emitted during that tick.
- `GameSession` (application) owns the accumulator: real elapsed time feeds ticks, with a **cap on catch-up ticks per frame (proposed: 3)** and a clamp on frame delta. On a slow device the game slows down rather than spiraling.
- The renderer reads **read-only views** of domain state each frame (TypeScript `Readonly`, no per-frame copying) and interpolates between the previous and current tick for smooth display on high-refresh screens.
- Aggregates are mutable *inside* the domain. Mutation happens only through the aggregate's own methods.

**Why:** deterministic, testable, pause-safe, and fast enough for phones without allocating every frame.

**Alternatives:** variable timestep (rejected: physics feel and tests depend on frame rate); immutable state with a copy per tick (rejected: garbage collection pressure on phones, and harder to read for this kind of simulation).

### D3. Determinism and random streams

**Revised 2026-09-24 (ADR-0002 D1).** The earlier version promised that the same seed gives the same scenario, for a daily seed. That promise is dropped.

**Decision:**
- A seedable RNG (a small mulberry32) is injected into the domain. The domain never creates randomness from the outside world.
- **Runs are random for players.** The composition root draws a fresh seed per run through the `SeedSource` port (the browser's `crypto`). Tests and the simulation harness pass a fixed seed, so a given seed plus the same inputs replays the same run in Node.
- **Gameplay and comms use separate streams**, both derived from the run seed. Picking a joke never changes what a gameplay test sees.
- `Math.random` and `Date` are forbidden in the domain (D1).
- **No promise across play or versions:** the same seed with different inputs is a different run, and the order in which the domain draws numbers may change in any release.

**Why:** the game is waves and jokes under fixed rules, and nobody asked for a shared scenario. Keeping one would tax every feature that uses randomness (hordes, patterns, drops) with a fixed draw order, for a daily seed that is only `[Later]`.

**Consequence:** a daily challenge or a "try my run" link would need a scenario discipline added back (per-cycle and per-spawn streams, a version stamp). Because randomness is already injected, that is contained to the domain's draws. We do not promise anti-cheat by replay (open question 5).

### D4. Rendering and platform: Phaser 4 behind an anti-corruption layer

**Decision:** use **Phaser 4** as the presentation and I/O platform: rendering, filters, lighting, animation, tweens, particles, camera fades, asset loading, scaling for phones, and (if the platform check passes) audio. Treat Phaser as an *external system*. An **anti-corruption layer** keeps its model (scenes, game objects, bodies) out of the domain. **The domain stays the authority for rules and for the simulation state those rules depend on.** The platform check validates Phaser against the gates below. If it fails one, the fallback is PixiJS, then Three.js.

**Who decides what**

| Concern | Owner |
|---|---|
| Rules and state: cycle, resurrection, fleet, damage, upgrades, Director | Domain |
| Kinematics that rules read: positions, velocities, gameplay collision checks | Domain |
| Drawing, animation, filters, lighting, particles, tweens, fades, loading, scaling | Phaser |
| Cosmetic physics (debris, casings) | Phaser, and the domain never reads it |
| Input | Our adapters (D6), or Phaser's input plugin if the platform check shows it can listen on our root element with pointer capture |
| Audio | ZzFX behind `AudioPort` (D12). Phaser's sound manager is not used; Phaser boots with `noAudio` |

**Why the domain keeps the kinematics.** Movement here is simple (integrate velocity, clamp to the play area, circle overlap), so a physics engine adds little. Keeping it in the domain buys: headless tests and the balance simulation harness (D13), a shared daily scenario and fixed-step determinism (D2, D3), pause safety (D7), and a bounded cost if we ever leave Phaser. This is the one place we hold the line. Everything else can lean on Phaser as a platform.

**Organizing Phaser code by bounded context**

```
src/infrastructure/phaser/
  PhaserGame.ts            # boots Phaser; the only composition root in this layer
  GameScene.ts             # shell: each frame calls session.advance(delta), then every presenter's sync(view)
  Presenter.ts             # interface: onEvent(event), sync(view)
  cues/                    # cue catalog: domain event -> named visual/audio cue (data)
  contexts/
    swarm/                 # SwarmPresenter
    combat/                # ViperPresenter, ProjectilePresenter, MissilePresenter
    fleet/                 # FleetPresenter (ship pips, stray-hit effects)
    cycle/                 # JumpPresenter, SpoolRingPresenter
    resurrection/          # GhostPresenter, ResurrectionShipPresenter
    progression/           # card and special effects
  shared/                  # atlas keys, object pools, filter setup, palette
```

**Rules**
- **One presenter per bounded context**, mirroring the domain folders. A presenter is the only code that translates between that context's concepts and Phaser objects.
- Presenters read read-only domain views and react to events. They never mutate the domain. Player actions go through application commands.
- The scene shell knows presenters only through the `Presenter` interface. Adding a context means adding a presenter.
- **Cue catalog:** one table maps domain events to cue names (`explosion_small`, `jump_wipe`, `stray_hit`), and cues are implemented once in `shared/`. Swapping engines means reimplementing cues and presenters, and nothing else.
- Phaser is imported only under `src/infrastructure/phaser/`. The dependency check enforces it.
- Phaser objects are never the source of truth for anything a rule reads.
- Cosmetic tweens, animations, and particles follow the game clock, so pause freezes them (D7). No Phaser timers or tweens for rule timing.
- Pin Phaser 4 in `AGENTS.md` and link its docs. Coding agents trained mostly on Phaser 3 can write v3-style code (pipelines, preFX and postFX), so reviews should look for it.

**Options considered**

| Option | Notes |
|---|---|
| **Phaser 4 (chosen)** | 4.2.1 at the time of writing (4.0.0 April 2026, 4.2.1 July 2026). New WebGL renderer, a unified filter system on any object or camera (the actual 4.2.1 list is Glow, Blur, Bokeh, Vignette, Pixelate, ColorMatrix, Threshold, Quantize, Displacement, Shadow, Wipe, Mask, Barrel, Blend, Blocky, GradientMap, ImageLight, and a few more — **there is no Bloom filter**, so Glow or Blur-plus-Blend stands in), built-in 2D lighting, animation, tweens, particles, loader, scale manager, input, audio, and physics. Large community and documentation, and agents know it well. Costs: a larger bundle (measured below), an opinionated platform that needs the rules above, and a young v4 API. |
| PixiJS (fallback) | Leaner and less opinionated. Fewer batteries: animation sequencing, tweening, particles, lighting, and sound are ours to assemble. |
| Three.js, orthographic (fallback, or if we ever want 2.5D or heavy shader work) | Most shader freedom, and familiar to the owner. Least 2D plumbing. Full 3D remains a non-goal. |
| Custom Canvas 2D | Smallest, but riskier on low-end phones and we would rebuild everything. |

**What choosing Phaser gives up:** a smaller bundle, the lowest-level shader freedom, and a less opinionated toolset.

**Platform-check gates (Phaser 4 must pass all of these on a real phone and in a desktop browser, during the first two slices)**
1. 300 sprites at 60 fps with the filters we want (glow, vignette, color matrix; 4.2.1 has no bloom). **Measure with `game.loop.actualFps`**, which is timed against the real clock. Counting frames against the delta Phaser passes to `update` reports a comfortable 60 on a browser that is actually running at five, because that delta is smoothed and clamped.
2. Crisp nearest-neighbor scaling at a low internal resolution (for example 270 x 480), with integer scaling on desktop.
3. Works under the strict CSP (D11).
4. Bundle size is acceptable. **Measured on 2026-09-20** with Phaser 4.2.1 and Vite 8.3.0, gzipped: the default `import Phaser from 'phaser'` entry costs 376 KB, a tailored build (WebGL only, no physics, tilemaps, or canvas renderer) costs 236 KB, and the Vue 3 runtime costs 38 KB. For comparison, a minimal PixiJS 8 app — one sprite and a ticker, with no filters, particles, tweens, or audio — costs 160 KB. The 300 KB budget therefore needs the tailored build, which needs three pieces of bundler configuration (alias `^phaser$` to a custom entry, stub `phaser3spectorjs`, define `global` as `globalThis`) and one non-obvious inclusion: the `Display` barrel, which attaches statics such as `Color.IntegerToColor` that the filters call at runtime. Sequencing: ship the default entry first, switch to the tailored build once an end-to-end boot test guards it, because its failures appear at runtime rather than at build time.
5. Input: can Phaser's input listen on our root element with pointer capture and stay layer-agnostic (D6)? If not, we keep our own adapters.
6. iOS audio unlock works, and audio suspends and resumes with the session.
7. Game-clock integration: Phaser's animations, tweens, and particles pause with our session.
8. Optional: cost of 2D lighting on the phone. If it is too costly, it becomes a desktop-only extra.

If a gate fails and cannot be fixed cheaply, build the same test scene in PixiJS and decide again. **Check current major versions when scaffolding.**

### D4b. How the scene is built: sprites for identity, shaders for atmosphere (proposed)

**Decision (proposed):** render the whole scene into one **low-resolution render target** at world size (for example 270 x 480) with nearest-neighbor filtering, then upscale it to the screen and apply optional post effects (scanlines, CRT) at that stage. Inside the scene:

- **Hand-drawn PNG sprites** for anything whose silhouette carries meaning: the Viper, Raiders, the resurrection ship, and the fleet ships. They share one atlas texture, so a hundred Raiders means a hundred quads using one texture, not a hundred copies of an image.
- **Code or shaders** for atmosphere and feedback: starfield and parallax, jump transition, FTL ring, Dradis sweep, engine glow, bullet trails, explosion particles, shockwave rings, and post effects.
- Portraits are images shown by Vue in the DOM overlay, not part of the scene.
- State changes on sprites (Returned, ghost, inert, damaged) use **tint, small code-drawn overlays, or extra frames first**. A custom shader per sprite is a later optimization only if needed, because per-sprite shaders and filters can break batching and are costly on phones.

**Why:** the whole planned sprite list is about 85,000 pixels, roughly 340 KB uncompressed in GPU memory, so memory is not the constraint. What matters is draw calls and fill rate, and a shared atlas keeps both low. Hand-placed pixels keep 12 to 16 pixel silhouettes readable, which a shader-authored shape at that size does not do well. Shaders are the better tool for the parts that should move, glow, and respond to game state.

**Alternatives:**
- *All sprites:* simple, but backgrounds and effects feel flat.
- *Fully procedural neon-vector look* (polygon outlines with glow, like Asteroids or a Dradis screen): the least art and the fastest iteration, and it suits the theme. It gives up the hand-drawn charm and the pixel palette identity, and shader-authored silhouettes are harder for a maintainer to tweak. The renderer port keeps this option open without touching the domain.

**Rules:** every shader effect has a reduced-effects mode (a uniform), obeys the no-flash rule, and lives in `infrastructure/phaser/shared` with comments. Keep GLSL small and readable. The platform check measures the cost of the starfield and the post pass on the reference phone.

### D5. UI layer: Vue 3 overlay on the canvas

**Decision:** Vue 3 (`<script setup>`, TypeScript) renders menus, HUD, comms, pause, and settings as DOM on top of the canvas. Presentation reads a small view-model store (Pinia proposed) fed by the application layer. Gameplay never reads from Vue state.

DOM structure and pointer policy:

```
<div id="game-root">                 all pointer listeners live here
  <canvas />                         no input logic
  <div class="hud">                  pointer-events: none
    <CommsPanel /> <JumpRing /> <FleetPips />
    <button data-ui class="pause" /> pointer-events: auto
  </div>
  <div class="scanlines" />          pointer-events: none
  <PauseMenu data-ui />              only mounted while paused
</div>
```

**Why:** DOM text is crisp, accessible (`aria-live`), and easy to animate, and Vue is the owner's preferred tool. Because overlays are transparent to pointer input by default, input works wherever the finger lands.

**Rules:** overlays are `pointer-events: none` unless they are real controls, and real controls carry `data-ui`. **Never use `v-html`** (enforced by lint). All content text is rendered as text.

### D6. Input: ports, adapters, one intent

**Decision:** Adapters produce one `InputIntent { moveX, moveY, missile, special }`. Adapters:
- **Keyboard** on `window`, keyed by `event.code` (physical keys), with `preventDefault` for arrows and space, held-key state cleared on blur, and diagonals normalized.
- **Pointer stick** on `#game-root` using Pointer Events in the **capture phase**, `setPointerCapture`, pointer-ID tracking, a dead zone, and a max radius. A touch starting on `[data-ui]` is not the stick. A second finger is a missile (edge-triggered).
- CSS on the root: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `overscroll-behavior: none`. Suppress `contextmenu`.
- No `InputRouter` for now: `GameSession` reads an intent only while it is running, so a router would hold no behaviour of its own. Add one when a second reader needs the same filtering.
- **The stick's on-screen indicator** (PRD 13.2) reads the adapter's own state, not domain state: where the touch landed is a fact about the input device, not about the world. The adapter exposes the origin and current pointer position in CSS pixels, and the presenter converts to world units through Phaser's scale manager. It follows the game clock like every other cosmetic, so a pause freezes its fade.

**Why:** the domain never learns how the player steers. Adding gamepad later is one new adapter.

**Test:** a Playwright matrix starts a drag on every layer (canvas, HUD, comms panel, scanlines) and asserts the Viper moves, then starts on the pause button and asserts it does not. A second-finger tap on each layer fires a missile. This protects against a future overlay silently swallowing input.

### D7. Session state, pause, and the game clock

**Decision:** `GameSession` in the application layer is a state machine (Title, Running, Paused, Resuming, GameOver). Pausing stops feeding ticks. The domain does not know pause exists.

`Resuming` is the 3-2-1 countdown: the simulation stays frozen, so it behaves like `Paused` as far as the domain is concerned, and it is the one thing that advances on real time rather than on the game clock — it is what brings the game clock back.

**Freezing Phaser's cosmetics** (verified in Phaser 4.2.1 on 2026-09-20): a paused scene stops emitting its update events, which freezes tweens, particle emitters, and sprite animations together, while rendering carries on. Confirmed empirically: after 1.2 s of pause a tween's elapsed time was unchanged, and resuming continued from that point with no catch-up jump. The finer levers are `scene.tweens.timeScale`, an emitter's `timeScale`, and `anims.globalTimeScale`, which are also how the slow-motion moment on the resurrection ship's death will work. The scene shell drives all three from the session's frozen flag.

- **Everything time-based follows the game clock:** comms expiry, cooldowns, the FTL ring, and effect timelines. No `setTimeout` or `setInterval` for gameplay. Portrait mouth animations pause via a `.paused` class and `animation-play-state`.
- Auto-pause on `visibilitychange`, window blur, `pointercancel`, and orientation change.
- Resume with a 3-2-1 countdown that clears input state, and **reset the loop timestamp** on resume so the first frame does not see a giant delta.
- Audio: `audioContext.suspend()` and `resume()` with the session.

### D8. Content as data; Banter as its own context

**Decision:** Lines, scenes, upgrade flair text, and portrait mappings live in `content/` as JSON, with TypeScript types and a **build-time validation script** (schema, length limits, unknown speakers, duplicate IDs, placeholders that do not exist). The Banter service in `application/banter` subscribes to domain events, applies priority, cooldowns, no-repeat memory, and shuffle-bag cameo rotation, and pushes a `CommsMessage` to the presentation store.

**Live now (2026-09-24):** `npm run check:content` (in CI) runs the game's own loaders over every file and names each line or scene they would drop, duplicate ids, unknown placeholders, markup, emoji, unknown cards, and missing flair. The loaders still drop bad content quietly at runtime, so a player never sees a broken line.

**Why:** writing jokes never touches game logic, and community contributors can send a pull request with only JSON. Content is bundled at build time, so nothing at runtime is fetched from a user-controlled source.

**Consequence:** a content checklist (spoilers, IP, tone, length) applies to every content pull request. It lives in AGENTS.md.

### D9. Configuration policy

**Decision:** three tiers, and a deliberate cap on how many knobs exist.

| Tier | What | Where | Example |
|---|---|---|---|
| **Invariants** | Facts of the design | Named constants in the domain | `CYCLE_SECONDS = 33` |
| **Balance** | Numbers that differ by difficulty | One typed `CycleProfile` per tier in `balance/` | Director cap, damage cap, repair rate |
| **Player settings** | Comfort and preference | Stored in localStorage, validated | Volume, comms duration, reduced effects |

```ts
// balance/tiers.ts -- the only place tier numbers live
export interface CycleProfile {
  calmSeconds: number;              // Recovering scene length; 0 = Sleepless
  maxConcurrentRaiders: number;     // Director cap; resurrection refills from it
  attackTokens: number;             // Raiders allowed to fire at once
  raiderFireIntervalSeconds: number;
  resurrectionDelaySeconds: number;
  viperHull: number;
  strayDamagePercent: number;       // of max fleet integrity
  fleetDamageCapPercent: number;    // per cycle
  fleetRepairRate: number;          // fraction of missing integrity restored per jump
  missileCapacity: number;
  returnedBehavior: 'marker' | 'vengeful' | 'traits1' | 'traits3';
}
```

**Rules:**
- The 33 seconds is not configurable. It is the game's identity.
- **Knob budget:** `CycleProfile` stays at or below about 12 fields, and player settings at or below about 8. Adding one requires a default, a unit in the name, a TSDoc comment, and a note in the pull request on why a constant would not do.
- No feature flags inside the domain. Staged features (Vengeful, traits) are selected by `returnedBehavior`, which is one field rather than a flag per feature.
- Upgrades are **data-driven modifiers** (effects hooked to a `StatBlock` or to `onHit`, `onKill`, `onCycleStart`), not a class per card. Flair text is presentation data.

**Live now (2026-09-24, ADR-0002 Phase 3):** the tiers are data in `src/balance/tiers.json`, one object per difficulty, checked by `parseTierProfile` on load and by `check:content` in CI, which names every bad value. `CycleProfile` has eleven fields: the fleet cap and repair; five **ramps** (`directorCap`, `swarmFloor`, `attackTokens`, `strafeTokens`, `sineShare`), lists by cycle whose last value repeats; download jitter; and three heavy-Raider numbers (`heavyFromCycle`, `heavyPerCycle`, `heavyMax`). A ramp counts as one knob, so the profile is at eleven of its twelve. The next knob (the resurrection ship's HP or shield timing is the likely one) needs a case, or a knob out. Tests that pass no profile get `DEFAULT_CYCLE_PROFILE`, built from the domain constants. Adding a difficulty is a JSON object plus its id in `TierId` and a title-screen button.

**Soon:** one JSON object per difficulty (typed, validated on load), still under the 12-field knob budget, so adding a third tier or retuning hits is data. Look into this before inviting players back onto a harder profile. Invariants (the 33) stay domain constants.

**Why:** the owner asked for configurability that does not overwhelm. Three tiers with a hard budget keeps the answer to "where do I change this number?" obvious.

### D10. Persistence and privacy

**Decision:** local-only for MVP.

- One storage adapter behind `StoragePort`. Keys are namespaced and versioned (for example `thirty-three:v1:settings`).
- Data is stored as a **versioned envelope** and **validated on every read**. Anything that fails validation is discarded and replaced with defaults. Migration functions handle version bumps.
- Assume the user can edit storage. Nothing security-relevant, and no leaderboard submission, may trust it.
- Wrap all reads and writes in `try/catch` (quota errors, Safari private browsing). The game must run correctly with storage unavailable.
- Store the minimum: settings, best score per tier, seen flags. No identifiers, no timestamps that could identify a person, no secrets.

**Live now (2026-09-22):** `StoragePort` plus `PlayerSettings` at `thirty-three:v1:settings` (`muted`, `reducedEffects`, `dragHintSeen`). Invalid, unversioned, and throwing reads become defaults. Mute works when writes fail. Best scores wait.

**Leaderboard (later, separate ADR before building):**
- Netlify Functions with Netlify Blobs (or Supabase if more is needed).
- **No free-text names.** Generated callsigns or a curated list.
- Server validates with a schema, checks score plausibility bounds, and applies rate limiting (confirm what the platform provides, or implement it).
- Same-origin only. Store the minimum: callsign, score, tier, game version, timestamp. Define retention.
- Client-submitted scores are forgeable. Position the board as for fun, and record that decision (open question 5).

### D11. Hosting, build, and security headers

**Decision:** Vite static build on Netlify with deploy previews. Headers are set in `netlify.toml`:

- `Content-Security-Policy`: start strict (`default-src 'self'`; scripts, styles, images, fonts, and connect all `'self'`; `img-src` also `data:`; `frame-ancestors 'none'`; `base-uri 'none'`; `form-action 'none'`), and loosen deliberately with a comment explaining each relaxation.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy`.
- Hashed assets served with long-lived immutable caching.
- **No third-party scripts, fonts, or embeds.** Fonts are self-hosted, which also means no request leaks a visitor's IP address to a third party.
- Dependencies: lockfile committed, few dependencies, `npm audit` and automated update PRs in CI, and install scripts disabled where possible.

### D12. Audio

**Decision:** Web Audio through an `AudioPort`. Effects synthesized with ZzFX or jsfxr. Music as small BeepBox exports. Original only.

- Audio starts on the first user gesture (the title screen's Launch button). This is required on iOS, and it is also what makes "no sound by surprise" (PRD 14.1) structurally true rather than a promise.
- Suspend and resume with the session (D7). Separate volumes for music, effects, and comms.
- Every audio cue has a visual equivalent (PRD section 15).
- **Mute is a setting, not an audio-engine detail.** It lives in the application layer beside the other player settings, so the HUD, the pause menu, and the title screen all read one piece of state, and `AudioPort` is told about it rather than owning it. That keeps the control available even before an audio engine exists, and it keeps a muted game silent if the audio adapter is ever swapped.
- Phaser boots with `audio: { noAudio: true }`: it never makes an audio context. Sound is ours alone.
- **Built (2026-09-24, ADR-0002 3.5).** `AudioPort` (application) has four verbs: unlock, play, suspend, master gain. `AudioDirector` (application) owns the cue table (domain event to sound id), the repeat limits (50 ms per sound, 3 voices per sound, 8 overall), pitch jitter from its own seeded stream, mute and volume, and when sound is held. `GameSession` feeds it running frames, the way it feeds comms, so pause freezes its clock. `ZzfxAudio` (infrastructure) synthesizes each sound once into a buffer and plays it through one master gain and a limiter.
- **ZzFX makes an `AudioContext` when its module loads.** So it is imported dynamically inside `unlock` (its own 1 KB chunk), our own context is created synchronously in the Launch gesture (iOS needs that), only its sample builder is used, and its spare context is closed. A static import anywhere would break "no audio before the first gesture"; an end-to-end test counts contexts to catch that.
- Sounds are data: `src/content/sounds.json`, validated by `check:content`. A hidden tab suspends sound separately from pause, because the Recovering sheet does not pause (PRD 13.3).

### D13. Quality strategy

**Decision:** the pure domain makes four kinds of automated checking cheap. Use them as they earn their place, starting with 1, 3, and 4. Add 2 when hand-tuning gets painful, not before.

1. **Engine tests (Vitest), heavy and deliberate.** The domain, and the session, pause, and fixed-step logic in the application layer, are tested thoroughly through public entry points (`game.tick`, aggregate methods, events). Scenario tests describe rules in plain language, and property-style tests protect invariants: fleet integrity never goes below zero or above max, the per-cycle cap is never exceeded, missile targeting ties break deterministically, the swarm never exceeds the Director cap, and a maximum-damage fleet survives forever if and only if repair rate exceeds the cap. Edge cases get particular attention: phase boundaries, pausing mid-phase, a kill and a jump on the same tick.
2. **Balance simulation harness** (`tools/`): headless bots (idle, bodyguard, ship-chaser) play thousands of seeded runs per tier and report win rate, fleet low point, and run length. Tier tuning is checked against numbers instead of hunches. It also verifies that stacking fleet-defense cards (flak, Raptor, Imaginary Six) does not make the fleet unloseable.
3. **End-to-end (Playwright)** for the input matrix (D6), pause and auto-pause, resume countdown, and mobile emulation.
4. **Architecture and content checks in CI:** dependency boundaries (D1), content schema (D8), and a test asserting that no effect definition flashes more than the allowed rate.

**Test value over test count.** A test belongs in the suite only if it would fail when a behavior that matters breaks. We test the engine heavily and everything else in proportion to risk. We do not write tests for getters, constants, config values, framework behavior, or large snapshots, we do not set a coverage target, and we treat flaky tests as bugs. Mocks are used only at ports. Deleting a test that protects nothing is encouraged, and occasional mutation testing on `domain/` is a way to find tests that do not bite (optional, not a CI gate). The detailed rules live in AGENTS.md, under Testing.

**Performance budgets (proposed, to be confirmed in the platform check):**
- 60 fps on the reference phone. Simulation stays at 60 Hz.
- Concurrent caps: Raiders by tier (about 12-30), enemy bullets about 80, player bullets about 60, particles about 150 (half on phones), total sprites about 350.
- Adaptive quality: if frame time exceeds budget for a couple of seconds, effects step down. The simulation is never simplified.
- Initial JavaScript bundle around 300 KB gzipped, excluding audio and art. Measured at 373 KB with Phaser's default entry (first slice, 2026-09-20); the tailored build that brings it under budget is sequenced in D4 gate 4. CI prints the gzipped size on every build.
- **Start with plain arrays of small records and object pooling.** Move hot paths to typed arrays only if profiling shows a need. Readability comes first.

---

## Trade-off analysis

| Trade-off | We chose | We gave up |
|---|---|---|
| Layer ceremony vs. speed of first prototype | Ports and adapters from day one | A few hours in the first slice, in exchange for a domain we can test and simulate |
| Engine batteries vs. owning the loop | Phaser 4 as a platform behind an anti-corruption layer, with domain-owned rules and kinematics | A fully engine-agnostic renderer, and a smaller bundle |
| Purity vs. phone performance | Mutable aggregates in the domain, read-only views out | Immutable snapshots |
| Replay verification vs. simplicity | Scenario-level determinism | Anti-cheat by replay |
| Flexible config vs. clarity | Three tiers and a knob budget | "Everything is tunable at runtime" |
| Test volume vs. test value | Heavy, deliberate engine tests, and few, sharp tests elsewhere | A coverage percentage, and tests that exist only to exist |

## Consequences

**Easier**
- Testing every rule in isolation, and simulating whole runs headlessly for tuning.
- Adding a second renderer, a gamepad, or a leaderboard without touching the game rules.
- Writing and reviewing jokes without touching code.
- Explaining where a number lives.

**Harder**
- More files and indirection than a single-file prototype. New contributors must learn the dependency rule.
- Keeping performance good without letting optimization tricks leak into the domain's readability.
- Read-only views and events require discipline to avoid quietly reaching into state from the presentation layer.

**To revisit**
- The renderer choice after the platform check.
- Typed arrays for the swarm, if profiling demands.
- Whether Pinia is needed or plain reactive composables are enough.
- Leaderboard design, in its own ADR.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Layer rules erode under time pressure | CI boundary check (D1) |
| Screen full of Raiders is a mess or too slow on phones | Director cap, attack tokens, hard caps, adaptive quality, budgets in the platform check |
| Phaser 4 fails a platform-check gate (CSP, size, mobile performance, input) | Fall back to PixiJS, then Three.js. Presenters and the cue catalog bound the cost of switching |
| Coding agents write Phaser 3-style code in a Phaser 4 project | Pin the exact version, and rely on strict TypeScript against Phaser 4's own types, which rejects the v3 surface (`setPipeline`, `preFX`, `postFX`) outright. Review for v3 idioms that still typecheck |
| Overlay swallows touch input | Capture-phase listeners, `pointer-events` policy, Playwright matrix |
| Community-contributed text causes a spoiler, IP, or safety problem | Build-time validation plus a review checklist, and text rendered only as text |
| Balance drift makes the game frustrating | Simulation harness thresholds and playtests |
| Forged leaderboard scores | Server plausibility checks, "for fun" positioning, revisit if it matters |
| Storage tampering or quota errors | Validate on read, discard invalid data, `try/catch` everywhere |
| Framework and library versions change | Check current majors at scaffold time and record them in the repo |

## Action items

1. [x] Confirm the decisions above, or record changes, and move to **Accepted**. (2026-09-20)
2. [ ] Platform check: the desktop and bundle gates (1 for desktop, 3, 4, 5, 7) passed on 2026-09-20; gates 1 on a phone, 2, 6, and 8 still need the reference device. Build a PixiJS comparison only if a gate fails.
3. [x] Scaffold the repo (Vite 8.3.0, Vue 3.5.43, TypeScript 6.0.3 strict, Vitest 5.0.1, Playwright 1.63.0, Phaser 4.2.1, Node 22.19.0), all pinned exactly with a committed lockfile. (2026-09-20)
4. [x] Add `dependency-cruiser` and the domain lint bans to CI, and prove they fail on a violation (`npm run check:guardrails`). (2026-09-20)
5. [ ] `netlify.toml` has the D11 headers, and `vite preview` mirrors them so the end-to-end tests boot under the real CSP. Still to do: check an actual deploy preview.
6. [x] (2026-09-24) Build the balance simulation harness in M2, when the first tunable numbers exist (this supersedes the earlier "alongside the first domain code", which contradicted D13). The seam it needs exists from the first slice: the domain is constructed headlessly and driven only by `tick(intent)`, and the harness will use the same scenario helpers the engine tests use. It lives in `tools/sim/` and may import only `domain` and `balance`, enforced by the boundary check.
7. [ ] Write a leaderboard ADR (the next free number; 0002 is the review roadmap) before building any server code.
8. [ ] Choose a reference phone and record the performance budget against it.

## Open technical questions

1. **Platform:** ~~Phaser 4, pending the platform-check gates in D4.~~ **Settled 2026-09-20: Phaser 4.** Fallbacks remain PixiJS, then Three.js, and the presenter boundary keeps that switch cheap. The on-device gates are still outstanding (action item 2).
2. **Swarm data layout:** plain records versus typed arrays, pending profiling (D13).
3. **State store:** Pinia versus plain composables (D5).
4. **Leaderboard backend:** Netlify Blobs versus Supabase, and how to rate-limit (D10).
5. **Anti-cheat:** accept forgeable scores, or invest in replay verification? This affects how much determinism we promise (D3).
6. **CSP and Phaser 4:** ~~confirmed compatible?~~ **Yes (2026-09-20):** the game boots and runs under the strict CSP with no `unsafe-eval` and an empty console, checked by an end-to-end test on every run. Building from Phaser's source removes even the `new Function` in its prebuilt dist's `globalThis` shim.
7. **PWA:** how much offline and install support at launch?
8. **Internationalization:** are we text-extraction-ready from the start, even if English only?
9. **Reference devices:** which phone and browser combinations count as supported?
10. **Runtime versions:** ~~Node, TypeScript, and framework versions to pin.~~ Pinned in `package.json` and `.nvmrc`, and listed in action item 3. Dependabot proposes updates weekly.
