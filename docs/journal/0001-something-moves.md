# 0001 — Something moves

**Date:** 2026-09-20
**Slice:** first slice of M1 ("Something moves")
**Ends with:** a Viper you can fly with a keyboard or a thumb, in a browser, that pauses properly.

---

## What we set out to do

M1 in the PRD is "fly and shoot": repo and guardrails, a Vue shell over a Phaser canvas, the
fixed-step loop, Viper movement on both input styles, auto-fire, one Raider, and pause. We split it:
this slice is everything except auto-fire and the Raider, so the guardrails and the loop get built
once, carefully, before there is any pressure to add content.

Deliberately not in this slice: auto-fire, Raiders, the 33-second cycle, fleet integrity,
resurrection, missiles, upgrades, comms, audio, storage and settings, and the balance harness.

## The engine question, settled with measurements

The ADR had picked Phaser 4 but its own status line contradicted its open questions, and the owner
had been going back and forth between Phaser and writing a small engine by hand. Two concerns were
named: that agents trained mostly on Phaser 3 would write v3 code into a v4 project, and that
Phaser's bundle size would cost performance.

So before writing any project code we built a throwaway spike: Phaser 4.2.1 (the current release,
from 2026-07-09) with Vite 8.3.0, 300 tinted sprites, a tween, a particle emitter, a vignette and a
glow filter, at 270×480 with nearest-neighbour scaling, served under the strict CSP from ADR D11.

Measured, gzipped, in a real Vite build:

| Bundle | Gzipped |
|---|---|
| `import Phaser from 'phaser'` (the default entry) | 376 KB |
| A tailored Phaser build: WebGL only, no physics, no tilemaps, no canvas renderer | 236 KB |
| Vue 3 runtime | 38 KB |
| PixiJS 8, minimal app: one sprite and a ticker, no filters, particles, tweens, or audio | 160 KB |

The spike ran 300 sprites with both filters and a particle emitter at a steady 60 fps in desktop
Chromium, under the strict CSP, with no `eval` in the shipped bundle. (There is exactly one
`new Function` in Phaser's prebuilt dist, in webpack's `globalThis` shim, wrapped in a `try`/`catch`
that falls back to `window`; building from Phaser's source removes it entirely.)

**Decision: Phaser 4, default import for now, tailored build once there is a boot smoke test to
protect it.** Writing an engine by hand would mean owning a sprite batcher, an atlas loader, a scale
manager, a particle system, a post-processing pass, and iOS audio unlocking — weeks of work in
exactly the areas that look fine on a desktop and break on someone's phone. And the architecture
already buys the thing that matters: the rules live in a pure domain, so Phaser only ever touches
presenters. PixiJS stays a real fallback, and its apparent size advantage mostly disappears once you
add the parts Phaser includes.

The v3-versus-v4 risk turned out to have a mechanical answer: strict TypeScript against Phaser 4's
own types rejects the v3 API surface (`setPipeline`, `preFX`, `postFX`) outright. Our spike proved
the point against us — it called `addBloom`, which the ADR listed as a Phaser 4 filter and which does
not exist in 4.2.1. It only slipped through because the throwaway probe had `@ts-nocheck` on it. The
ADR's filter list has been corrected.

## Dead ends worth knowing about

**The tailored Phaser build needs three bundler hacks**, and one of its failures is invisible until
runtime. Aliasing `^phaser$` to a custom entry, stubbing the embedded SpectorJS WebGL inspector, and
mapping `global` to `globalThis` were expected. The interesting one: Phaser's own `phaser-core` entry
omits the `Display` barrel, and that barrel is what attaches `Color.IntegerToColor` as a static.
Without it, the vignette filter throws the first time you set its colour — at runtime, not at build
time. That is why the tailored build waits for a Playwright test that boots the game and asserts
there are no console errors.

**Two of our own end-to-end tests were wrong in an instructive way.** Both read the debug readout
*before* the action they were testing. The readout refreshes four times a second, so a "ticks did not
advance while paused" assertion compared a stale baseline against a fresh reading and looked like the
pause was leaking ticks. The fix was to read the baseline after pausing. Worth remembering: a test
that samples a throttled display needs to sample it after the thing it is testing.

**A test that protected nothing.** `npm run check:guardrails` breaks the code on purpose, twelve ways,
and checks that a check or a test fails. Eleven were caught immediately. The twelfth was not: removing
the rule that zeroes the Viper's velocity when it hits a wall changed nothing the test looked at,
because the clamp pins the position either way. The test was asserting the wrong thing. The behaviour
that actually matters is that turning away from a wall responds immediately instead of first spending
leftover momentum, which is what the test now asserts.

## What we built

- **Guardrails first:** CI (typecheck, lint, boundary check, tests, build, plus a printed bundle
  size), actions pinned to commit SHAs with read-only permissions, Dependabot, `netlify.toml` with
  the strict CSP and security headers, an exact-pinned lockfile, `.nvmrc`, and `.gitignore` covering
  `.env*`.
- **The layer rule, enforced:** dependency-cruiser for imports, and ESLint bans inside `src/domain`
  on `window`, `document`, `Date`, `Math.random`, `setTimeout`, and friends.
- **The domain:** a Viper with acceleration smoothing, top speed, and a clamp that keeps the whole
  ship inside the 270×480 world, driven only by `tick(intent)`, which returns events.
- **The session:** a fixed 1/60 s step with a 3-tick catch-up cap, a frame-delta clamp, phases
  (title, running, paused, resuming), auto-pause on a hidden tab, a blurred window, a cancelled
  pointer, and a rotated screen, and a 3-2-1 resume countdown that clears held input.
- **Adapters:** keyboard by physical key code on `window`, and a floating drag stick on the game root
  in the capture phase with pointer capture, a dead zone, and a maximum radius.
- **Phaser:** one scene shell that advances the session and syncs presenters, and one `ViperPresenter`
  drawing flat placeholder shapes, interpolating between the last two ticks.
- **Vue overlay:** a placeholder title screen with the fan-project disclaimer, a HUD that is
  transparent to pointer input, a pause overlay that says *why* it paused, and a debug readout.

## What we tested, and what we did not

Engine tests run in Node with no DOM at all — the point of the layer rule. Twenty-nine of them cover
movement (acceleration, top speed however hard the input pushes, diagonals no faster than straight
lines, edge clamping, nonsense input, deterministic replay from the same intents) and the session
(one tick per frame at 60 Hz, honest simulated time at 144 Hz, the catch-up cap, no spiral under
sustained slow frames, a discarded stall, each auto-pause trigger, pausing mid-countdown, and no tick
backlog after a long pause).

Eighteen Playwright checks run on desktop and emulated mobile: a drag over the canvas steers, a drag
starting on the HUD readout still steers, a drag starting on the pause button does not steer, the
keyboard steers by physical key position, Esc pauses and freezes the tick count, the countdown brings
the game back, a synthetic window blur pauses by itself, the pause button is at least 44×44 px, and
the game boots under the production CSP with an empty console.

Phaser rendering is not unit tested, by policy. The phone check is still the owner's to do.

## Numbers from this slice

- Initial JavaScript: **373 KB gzipped** (Phaser default entry plus Vue), against a 300 KB budget.
  The tailored build measured at 236 KB in the spike, so the budget is reachable; CI prints the size
  on every build, and today it prints "OVER BUDGET" without failing.
- 60 fps in desktop Chromium at 270×480 upscaled 2.2×.
- 29 engine tests, 18 end-to-end checks, 12 deliberate sabotages all caught.

## What is still open

1. **The phone check.** Gates 1, 2, 6, and 8 in ADR D4 need a real device: sustained 60 fps, crisp
   integer scaling, iOS audio unlock, and the cost of 2D lighting. Nothing here can substitute.
2. **The tailored build**, once the boot smoke test has proven itself for a slice.
3. **The stick has no indicator yet, and that is the first thing the next slice builds.** The stick
   works, but nothing draws where your thumb landed or which way you are pulling, so on a phone the
   controls are invisible: you cannot tell that touching means flying, or how much speed you are
   asking for. The PRD covered this in a single clause ("a faint pixel ring and dot show the origin");
   that clause is now a set of rules in 13.2, plus a first-run hint, because the vague version is
   exactly the kind of thing that gets skipped twice.
4. **The debug readout** is doing double duty as the end-to-end tests' window into the simulation. It
   should go away with the real HUD, and those tests will need another honest observation point.
5. **The mute control.** There is no audio yet — Phaser boots with `noAudio`, so no audio context even
   exists — but the rule for it was written before the first sound, as PRD 14.1: nothing plays before
   the Launch button, the title screen announces sound in words and offers the choice there, and mute
   is one tap away in the HUD and the pause menu. Writing the rule first exposed a scheduling bug:
   settings and storage sat in M6 while audio sat in M5, which would have produced a build with sound
   and no way to turn it off. Settings and storage moved to M5, ahead of the first sound.
