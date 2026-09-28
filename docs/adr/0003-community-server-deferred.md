# ADR-0003: A community tally and a leaderboard (deferred)

**Status:** Proposed, deferred (2026-09-28). Nothing here is built. Read it again before writing any
server code, and move it to Accepted, with changes, when the owner promotes it.
**Date:** 2026-09-28
**Deciders:** Moriel (owner)
**Related:** [ADR-0001](0001-architecture.md) D10 and D11, [ADR-0004: challenges](0004-challenges.md),
[PRD](../PRD.md) 17 and 19

---

## Context

The game is for a fan community, and the owner wants more to share than a single result. On
2026-09-28 we looked at what would need a server and what would not:

- **No server:** share links (built), challenge links and challenges (ADR-0004), a community
  channel where people post their share cards.
- **A small server that stores no rows about people:** an anonymous weekly tally.
- **A classic leaderboard:** named entries, with generated callsigns.
- **Real-time co-op:** a PRD non-goal. Netlify cannot host WebSockets, and lockstep netcode is a
  different project. Not considered further.

The owner chose to build the no-server options first (ADR-0004) and to keep this design for later.
It is written down now so the constraints we agreed are not lost.

## Decision (when promoted)

Build it in two steps, in this order.

### Step 1: the fleet tally (no rows about people)

One Netlify Function (`netlify/functions/fleet-tally`) with Netlify Blobs. Same origin, so the CSP
keeps `connect-src 'self'`.

- **Report (POST), opt-in.** Nothing leaves the device unless the player presses **Report to the
  fleet** on the end screen. No consent wording is needed, and the Training Run, an abandoned run,
  and a development build never send anything.
- **What is sent:** the challenge id (or story mode), tier, outcome, score, cycle reached, Raiders
  destroyed, game version. Nothing else. No id, no callsign, no timestamp from the client.
- **What is stored:** counters only, per ISO week and per challenge: a score histogram in fixed
  buckets, and totals (runs, Raiders destroyed, jumps survived, fleets saved). No row per report.
  Nothing in storage can be traced to a person, so there is nothing to delete on request.
- **What it answers:** "you beat N% of runs this week" (from the histogram, returned with the
  report), and the week's community totals (GET).
- **Retention:** 8 weeks. Older weeks are deleted when a new week's first report arrives.
- **Validation:** a schema on the server, the same bounds the share link reader uses, plus
  plausibility bounds taken from `npm run sim` (for example, most points possible per cycle). An
  out-of-range report is rejected whole, not clamped.
- **Rate limit:** the platform's per-function rate limit. Netlify sees the IP to enforce it; our
  code never reads, logs, stores, or hashes it.
- **Deploy previews** write to a deploy-scoped store, so testing never touches the real numbers.
- **Architecture:** the schema, the week key, the buckets, and the percentile are pure functions
  in `application/`, tested there. The function is a thin adapter over them and a store port, and
  `check:arch` covers `netlify/` (it may import `application` and `domain`, nothing in
  `presentation` or `infrastructure`). The client talks to it through a `FleetTallyPort`, and
  `npm run dev` uses an in-memory fake.
- **New dependency:** `@netlify/blobs`, used by the function only. `netlify-cli` is not needed;
  the deploy preview is where the real function is tested.

### Step 2: a weekly leaderboard (only if players ask for names)

- **Callsigns are generated** from two curated word lists (for example, an adjective and a noun).
  No free text, ever. Test the combinations, not only the lists: two harmless words can make an
  awkward pair, and some players may be minors.
- **Stored per entry:** callsign, score, challenge, tier, game version, **ISO week**. No timestamp,
  no device id. The callsign is remembered locally so a player keeps theirs.
- **Top 20 per challenge per week**, reset weekly. A forged score does not live forever, and the
  store stays small.
- **A run token.** At launch the client asks for a signed nonce with the server's start time. A
  submission must arrive at least the run's cycles times the cycle length later. That stops
  scripted spam cheaply. It does not stop a determined cheat, and the board says it is for fun.
- **No device id in `localStorage`.** A persistent random id is a pseudonymous identifier. The
  server returns your rank in the reply to your own submission instead.

### Not planned

- **Replay-verified scores** (submit seed plus inputs, re-simulate in the function). Possible in
  principle, since a seed plus the same inputs replays the same run in Node (ADR-0001 D3), and the
  function deploys from the same commit as the site. It would make determinism a promise to
  players, and cost function time. Only if cheating ever matters.
- **Real-time co-op.** See Context.

## Things to check before building

1. Whether per-function rate limiting is available on the owner's Netlify plan, and its limits.
2. Whether Netlify Blobs supports conditional writes (an ETag match), so two reports at once do not
   lose a count. If not: write one key per report, total them on read behind a short cache, and let
   the weekly reset bound the list.
3. The free-tier limits for function invocations and Blobs at the time of building.

## Consequences

- **Privacy:** step 1 stores no personal data and needs only a short "What we store" note in About.
  Step 2 stores a generated callsign, which names nobody, and still needs that note.
- **Cost:** one function, one store, no accounts, no moderation queue.
- **What forgery costs us:** a forged report moves a histogram a little; a forged leaderboard entry
  lasts a week at most.

## Why deferred

The client-only challenges (ADR-0004) give players something to share and compare without any of
this. If the community wants a shared number or a board after that, step 1 is small and changes
nothing the game already stores.
