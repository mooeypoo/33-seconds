# Developing 33 Seconds

This guide is for anyone who wants to run the game locally, read the code, or send a change. For
what the game is, start with the [README](README.md).

## Quick start

Node is pinned in `.nvmrc` (22.19.0).

```bash
nvm use        # or install Node 22.19.0 however you like
npm ci
npm run dev
```

Open the printed URL. The dev server reloads as you edit.

## The architecture

The full guidelines, and the reasoning behind each one, are in
[ADR-0001](docs/adr/0001-architecture.md). Its "Guidelines at a glance" section is one screen long.
This is the short version.

### Layers, and one direction of dependency

```
src/domain/          Pure TypeScript game rules, and the state the rules read. Imports nothing.
src/application/     The session: the fixed-step loop, pause, settings, share links, ports.
src/infrastructure/  Adapters: Phaser (one presenter per domain area), input, audio, storage, random.
src/presentation/    The Vue 3 overlay: title, HUD, comms, cards, pause, end screen.
src/content/         Text as JSON: comms banter, card flavor, scenes, endings.
src/balance/         The typed tier profiles and scoring data.
```

`presentation` and `infrastructure` depend on `application`, which depends on `domain`. Nothing
points back. `presentation` does not reach into `infrastructure` directly, and only
`src/infrastructure/phaser/` may import Phaser.

`npm run check:arch` enforces this with [dependency-cruiser](.dependency-cruiser.cjs), and ESLint bans
`Math.random`, `Date`, timers, and browser globals inside `src/domain`. CI fails if either slips.

### Why it is built this way

- **The rules are testable without a browser.** The domain advances in fixed 1/60 s ticks:
  `tick(intent)` takes one `InputIntent` and returns past-tense events such as `RaiderDestroyed`.
  Randomness is injected and seeded, so a run can be replayed exactly.
- **Balance is measured, not guessed.** Because the domain is pure, `npm run sim` plays every
  difficulty tier with headless bots and prints a report.
- **Rendering is swappable.** Phaser only turns domain events and read-only state into sprites,
  effects, and sound. It is never the source of truth for a rule.
- **Pause is exact.** Everything time-based follows the game clock, including cosmetic tweens, so
  pausing freezes the whole world. Nothing gameplay-related uses `setTimeout` or Phaser timers.
- **Content and numbers are data.** Jokes and card flavor live in `src/content`, tuning numbers
  live in one typed tier profile, and both can change without touching the rules.

### The other documents

| Document | What it holds |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | The rules of the game. A living document, updated as we play. |
| [`docs/adr/`](docs/adr/) | Architecture decisions and the current review roadmap. |
| [`docs/journal/`](docs/journal/) | One entry per slice: what we built, what we measured, what surprised us. |
| [`AGENTS.md`](AGENTS.md) | The working agreement for humans and AI coding agents on this repo. |
| [`assets/PROVENANCE.md`](assets/PROVENANCE.md) | Where every non-original asset came from, and its license. |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the build under the same security headers as production |
| `npm run typecheck` | `vue-tsc` across the app and the tooling configs |
| `npm run lint` | ESLint, including the bans that keep `src/domain` pure |
| `npm run test` | Vitest engine tests (domain and session), headless, no DOM |
| `npm run test:watch` | The same tests, in watch mode |
| `npm run test:e2e` | Playwright flows: input over overlays, pause, CSP boot |
| `npm run check:arch` | dependency-cruiser layer-boundary check |
| `npm run check:content` | Validates banter, scenes, card flair, and tier data |
| `npm run sim` | Balance report: every tier against headless bots (ADR-0001 D13) |
| `npm run check:guardrails` | Breaks the code on purpose and checks that something fails. Run by hand after touching the guardrails. |
| `npm run render:share` | Renders the link-preview card and favicons into `public/`. Run by hand after changing the share card, the Viper sprite, or the fonts. |

## Contributing

### Report a bug or suggest a feature

[Open an issue](https://github.com/mooeypoo/33-seconds/issues/new/choose) and pick a form: **Bug
report**, **Playtest notes**, or **Idea or change request**. Each form asks for what we need, such as
the device, the browser, and a share link from the end screen. Blank issues are turned off, so every
report arrives with that context.

New mechanics, cards, and content are the owner's call, so please open an issue to discuss them
before you write code.

### Fork, change, and send a pull request

1. **Fork** the repository on GitHub, then clone your fork:
   ```bash
   git clone git@github.com:<you>/33-seconds.git
   cd 33-seconds
   npm ci
   ```
2. **Branch** from `main`: `git checkout -b fix-missile-lock`.
3. **Make a small change.** One behavior per pull request is easiest to review.
4. **Test the behavior you changed.** A bug fix starts with a failing test. Test through public
   entry points, not internals, and do not add tests for getters or constants. If you break the
   code on purpose and your test still passes, it is not protecting anything.
5. **Update the docs in the same change.** If a game rule changed, update `docs/PRD.md` and add a
   changelog line. If the architecture changed, update the ADR.
6. **Run the checks** that CI runs:
   ```bash
   npm run typecheck && npm run lint && npm run check:arch && npm run check:content && npm run test && npm run build
   npm run test:e2e   # needs `npx playwright install chromium` once
   ```
7. **Open a pull request** against `mooeypoo/33-seconds`. The template asks for a summary, any
   assumptions, and what your tests protect. If you changed controls or performance, say whether you
   tried it on a phone.

### License of contributions

33 Seconds is licensed under the [GPL v3.0 or later](LICENSE). By sending a pull request, you
agree that your contribution is released under the same license.

### House rules

- **Privacy:** no accounts, analytics, cookies, free-text input, or third-party scripts or fonts.
  Some players may be minors. `localStorage` is untrusted: version it, validate it, and make the
  game work without it.
- **Security:** never use `v-html` or `innerHTML` with content. The CSP in `netlify.toml` is strict,
  and loosening it needs a comment saying why.
- **Comfort:** no camera shake, wobble, or flashing. Color is never the only cue, and every sound
  has a visual equivalent.
- **Dependencies:** add them sparingly, pin them exactly, and explain why in the pull request.
- **Content and IP:** original art, audio, and text only. No show footage, music, voice clips, or
  actor likenesses, and no quoted scripts. Keep it spoiler-safe, and aim jokes at the show's quirks,
  never at the cast, the community, or real people.
