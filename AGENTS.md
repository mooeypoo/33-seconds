# AGENTS.md

Read this file first, every session. It is short on purpose.

## The project

**33 Seconds** is a pixel-art, survivors-style browser shooter (desktop and phone) for a Battlestar Galactica fan community. You fly a Viper defending a civilian fleet through 33-second cycles. Cylon Raiders you destroy keep resurrecting until you destroy the resurrection ship. It should be funny, fair, and never frustrating. It is a free, unofficial fan project.

## The documents

| Document | What it is | When to read |
|---|---|---|
| `docs/PRD.md` | The game's rules and scope. **A living document**, adjusted as we play. | Read "How to use and change this document" and "MVP at a glance" every session. Read the sections your slice touches. |
| `docs/adr/0001-architecture.md` | The architecture guidelines and the reasoning. | Read "Guidelines at a glance" every session. Read the decisions your slice touches. |
| `docs/journal/` | One entry per slice: what we built, what we measured, what surprised us. Blog-ready. | Skim the latest entry every session. Add one at the end of each slice. |
| `docs/art/`, `docs/content/` | Notes for the owner's own art and content passes. | Only when asked to work on assets or content. |

If the documents disagree with each other or with this file, **stop and tell me** before choosing.

## How we work

This project is built iteratively. There is no big up-front design phase.

- **Small vertical slices.** Each slice ends with something playable in a browser, and on a phone when relevant. The PRD's milestones are a guide, not a contract.
- **Plan in chat, not in documents.** Before a slice, give me a plan in 3 to 7 bullets: what you will build, what you will test, what you will *not* do, and anything you are unsure about. Start when I say go.
- **You have creative freedom in how**, within the PRD and the architecture. Suggest improvements and label them as suggestions. Do not invent new mechanics, features, or content without asking.
- **Tests and code are the executable spec.** When behavior changes, update the PRD in the same change (see the PRD's rules for changing it). When architecture changes, update the ADR.
- **Placeholders are fine.** Use flat colored shapes for art and clearly labeled fake text for jokes. I do the real assets and content separately, so keep both data-driven and easy to swap.
- **Git:** do not push, merge, or open pull requests. Keep commits small. When I ask, propose a trimmed set of commits and a commit message.

### A slice is done when
- It is playable and does what the plan said.
- Typecheck, lint, tests, and the architecture boundary check pass.
- Tests protect real behavior (see Tests below).
- The PRD or ADR is updated if rules or architecture changed.
- You have told me what you assumed and anything I should decide.

### The first slice also sets up these guardrails
Keep them light, but do them early, because they are cheap now and expensive later.
- **CI** that runs typecheck, lint, tests, and build. Least-privilege permissions, and third-party actions pinned to a commit SHA.
- **A dependency-boundary check** enforcing the layer rule, plus lint rules banning `Math.random`, `Date`, timers, and browser globals inside `src/domain`, and `vue/no-v-html` everywhere. Prove once that the check fails on a violation.
- **`netlify.toml`** with a strict CSP and basic security headers (see the ADR). Loosen only with a comment saying why.
- **Basics:** committed lockfile, pinned Node version, `.gitignore` covering `.env*`, a README, and an automated dependency-update config.
- **A platform check on a real phone** during the first two slices, against the gates in ADR-0001 D4. If Phaser 4 fails a gate badly, stop and tell me.

Keep the scripts you create listed here: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`, `test:e2e`, `check:arch`, and `check:guardrails` (breaks the code on purpose, fifty-three ways, and checks that a check or a test fails; run it by hand after touching the guardrails or the engine tests).

### Stop and ask when
- The PRD, the ADR, and this file are ambiguous or disagree.
- You need a new dependency, a browser API inside the domain, a loosened CSP, or anything that stores or sends user data.
- A slice grows beyond what we agreed.
- You are about to encode an assumption that would be expensive to reverse.

If you must proceed, choose the most reversible option and mark it `// ASSUMPTION: <what and why>`.

## Architecture rules (always)

Full guidelines and reasoning are in the ADR.

1. **Layers:** `presentation` and `infrastructure` depend on `application`, which depends on `domain`. The domain imports nothing else.
2. **`src/domain` is pure TypeScript:** all game rules, plus the state that rules read (positions, HP, cooldowns, timers). No Phaser, Vue, DOM, `Math.random`, `Date`, or timers.
3. **Time and randomness:** the domain advances in fixed 1/60 s ticks (`tick(intent)` returns events). Randomness is injected and seeded. Jokes and cosmetics use their own random stream and never touch gameplay.
4. **Stack:** TypeScript (strict), Vue 3 for menus, HUD, comms, and pause (a DOM overlay), **Phaser 4** for the canvas, Vite, Vitest, Playwright (a few end-to-end flows), Netlify (static). This is Phaser **4**: do not write Phaser 3 code (pipelines, preFX, postFX). Check the current docs when scaffolding.
5. **Phaser is an external system.** Import it only under `src/infrastructure/phaser/`, organized as one presenter per domain area that turns domain events and read-only state into sprites, effects, and sound. Phaser objects are never the source of truth for a rule. Cosmetic tweens and particles follow the game clock so pause freezes them.
6. **Events flow out of the domain** (past tense, like `RaiderDestroyed`). Presentation, audio, and comms react to them. The domain never knows they exist.
7. **Input** becomes one `InputIntent` (move, missile, special). Pointer listeners live on the game root element, not the canvas, so touches work over any overlay; keyboard listeners live on `window`, because a div gets no key events without a tabindex and blur must clear held keys. Overlays are `pointer-events: none` unless they are real controls (marked `data-ui`).
8. **Pause is an application concern.** Nothing gameplay-related uses `setTimeout`, `setInterval`, or Phaser timers. Auto-pause when the tab is hidden or the window loses focus.
9. **Data, not code:** difficulty numbers live in one typed tier profile, and text (jokes, card flavor) lives in JSON.

## Always consider

**Security and privacy**
- No personal data: no accounts, free-text input, cookies, analytics, or third-party scripts or fonts. Some players may be minors.
- `localStorage` is untrusted because users can edit it. Version it, validate on read, wrap it in `try/catch`, and make the game work without it.
- Never use `v-html` or `innerHTML` with content. Text renders as text.
- Add dependencies sparingly, and tell me why. Never commit secrets.
- Anything with a server (a leaderboard, say) needs a short design note first: no free-text names, schema validation, rate limiting, minimal stored fields.

**Accessibility and comfort (non-negotiable)**
- No camera shake, wobble, double vision, or rapid flashing (well under 3 per second). The jump is a fade, not a white flash. Respect `prefers-reduced-motion` and keep an in-game reduced-effects toggle. Any shader effect needs a reduced version.
- Color is never the only cue.
- No timers on menu decisions. It must be playable one-handed on a phone. Text must be legible.
- Every audio cue has a visual equivalent.

**Tests: valuable, never filler**
- Test the engine (`domain` and the session and pause logic) heavily and adversarially: edge cases, phase boundaries, pausing mid-phase, simultaneous events.
- Test behavior through public entry points, not internals. Use scenario tests and property-style tests for invariants (for example, fleet integrity stays within bounds and the damage cap holds).
- Do **not** test getters, constants, config values, framework behavior, or large snapshots. Do not chase a coverage number.
- Sanity check: break the code on purpose. If the test still passes, it protects nothing, so fix it or delete it.
- A flaky test is a bug. A bug fix starts with a failing test.
- Phaser rendering is not unit tested. Cover it with a couple of Playwright flows (input over an overlay, pause) and a manual phone check.

**Keep it simple**
- Readable over clever. Small files. Named constants with units (`spoolSeconds`). Comments explain *why*.
- No abstraction until the third real use. Start with plain arrays and object pooling, and optimize only after measuring.
- Few config knobs: constants first, then one typed tier profile, then a handful of player settings. No config for hypothetical needs, and no feature flags in the domain.

**Content and IP**
- Original art, audio, and text only: no show screenshots, music, voice clips, or actor likenesses, and no quoting scripts. Catchphrases sparingly.
- Spoiler-safe (early-episode knowledge only), and no line implies that a specific named character is a Cylon.
- Jokes aim at the show's quirks, never at the cast, the community, or real people.

**Raise concerns early**
When something is ambiguous, conflicting, or worrying, say so in chat with the options and a recommendation. A short note that turns out to be unneeded costs little. A silent wrong assumption costs a lot. When we decide something, record it where it belongs: game rules in the PRD (and its changelog), architecture in the ADR.
