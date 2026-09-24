# 33 Seconds

A pixel-art, survivors-style browser shooter. You fly a Viper defending a civilian fleet through
33-second cycles, and the Cylon Raiders you destroy keep resurrecting until you find and destroy the
resurrection ship.

Free, unofficial fan project. Not affiliated with or endorsed by the show's rights holders or anyone
in the cast. All art, audio, and text are original.

## Running it

Node is pinned in `.nvmrc` (22.19.0).

```bash
npm ci
npm run dev
```

Then open the printed URL. Move with WASD or the arrow keys, or drag anywhere on a touch screen.
Pause with Esc, P, or the pause button.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the build under the same security headers as production |
| `npm run typecheck` | `vue-tsc` across the app and the tooling configs |
| `npm run lint` | ESLint, including the bans that keep `src/domain` pure |
| `npm run test` | Vitest engine tests (domain and session), headless, no DOM |
| `npm run test:e2e` | Playwright flows: input over overlays, pause, CSP boot |
| `npm run check:arch` | dependency-cruiser layer-boundary check |
| `npm run check:content` | Validates banter, scenes, and card flair in `src/content` |
| `npm run sim` | Balance report: every tier against headless bots (ADR-0001 D13) |
| `npm run check:guardrails` | Breaks the code on purpose and checks something fails |

## How it is put together

```
src/domain/          pure TypeScript game rules and the state rules read. Imports nothing.
src/application/     the session: fixed-step loop, pause, ports
src/infrastructure/  adapters: input, and Phaser behind one presenter per bounded context
src/presentation/    Vue 3 overlay: menus, HUD, pause
```

Dependencies point one way only: `presentation` and `infrastructure` depend on `application`, which
depends on `domain`. `npm run check:arch` fails the build if that slips.

The documents that matter are [`AGENTS.md`](AGENTS.md) (how we work),
[`docs/PRD.md`](docs/PRD.md) (the rules of the game),
[`docs/adr/0001-architecture.md`](docs/adr/0001-architecture.md) (the architecture and why), and
[`docs/journal/`](docs/journal/) (what we built each slice, and what we learned).

## Privacy

The game collects nothing: no accounts, no analytics, no cookies, no third-party scripts or fonts,
and no free-text input. Local storage will hold only settings and best scores, and it is treated as
untrusted.
