# Content schema

The technical contract for comedy and banter content. Writers only touch JSON. The banter service (ADR-0001, D8) reads it. `npm run check:content` validates it at build time.

This document is authoritative for line and scene fields. It replaces the shorthand example in PRD section 12.4.

## 1. Files

```
src/content/
  banter/
    adama.json  starbuck.json  gaeta.json  dualla.json
    tigh.json   baltar.json    roslin.json  tyrol.json   six.json
  scenes/
    recovering.json
  upgrades.flair.json
```

One file per speaker keeps each voice consistent and makes pull requests easy to review.

## 2. Pools

A speaker file is one voice and a list of pools. A pool is one moment: the same trigger, priority, and cooldown, with the jokes in an array. The game still shows one line. It expands each pool into one internal line per text, copying the shared fields, then picks among the lines that are eligible.

```json
{
  "speaker": "dualla",
  "pools": [
    {
      "trigger": "FtlSpoolProgress",
      "priority": "critical",
      "cooldownSeconds": 20,
      "when": { "spoolSecondsLeft": { "max": 8 } },
      "lines": [
        {
          "id": "dualla-ftl-spool-progress-01",
          "text": "Fleet FTL spooling. Jump in {seconds}.",
          "weight": 3
        },
        {
          "id": "dualla-ftl-spool-progress-02",
          "text": "Nine of twelve. The slow one is thinking about it.",
          "weight": 1
        }
      ]
    }
  ]
}
```

Shared on the pool:

| Field | Type | Rules |
|---|---|---|
| `trigger` | string | One of the triggers in section 4. |
| `priority` | string | `critical` (jump countdown; always shown), `normal`, or `flavor` (dropped first, suppressed in crises). |
| `cooldownSeconds` | number | Game seconds before a chosen line from this pool can repeat. The cooldown is still per line, not per pool: saying one joke does not retire the others. |
| `chance` | number, optional | From 0 to 1. Before this pool can enter the draw, the banter stream rolls once. Omit it, or set `1`, and the pool is always eligible. Other pools for the same trigger roll on their own. A missed roll means this speaker stays quiet and someone else can still talk. |
| `when` | object, optional | Conditions every line in the pool must pass. Section 3. Omit for "always eligible". |

On each line:

| Field | Type | Rules |
|---|---|---|
| `id` | string | Unique across all files. Format: `{speaker}-{trigger-kebab}-{nn}`. |
| `text` | string | Plain text only. Up to **72 characters** (about two lines in the portrait bubble). No markup, HTML, or emoji. Placeholders allowed: `{seconds}`, `{count}`, `{total}`, `{percent}`. Each must be one the trigger provides. |
| `weight` | number, optional | Relative pick chance among eligible lines. Default 1. Use this for a rarer joke inside a pool that already fired. Use `chance` when the speaker should sometimes say nothing. |
| `when` | object, optional | Extra conditions for this line only. It must also pass the pool's `when`. |

`speaker` is the file, not a field on every line. One of: `adama`, `starbuck`, `gaeta`, `dualla`, `tigh`, `baltar`, `roslin`, `tyrol`, `six`.

Split a moment into two pools when the lines do not share priority, cooldown, chance, or the same `when`. A spool line for the last few seconds is its own pool.

Placeholder files currently in `src/content/banter/` are still one object per line. The content pack replaces them with pools. Do not mix both shapes in one file.

## 3. Conditions (`when`)

Keep this list small. Every addition is complexity the engine must support.

| Key | Meaning |
|---|---|
| `tier` | List of tiers the line is eligible for |
| `cycle` | `{ "min": n, "max": n }` cycle index range |
| `spoolSecondsLeft` | `{ "min": n, "max": n }` seconds left before the jump |
| `fleetPercent` | `{ "min": n, "max": n }` Fleet Integrity |
| `damageBand` | `clean`, `rough`, or `wrecked` (used by Recovering scenes) |
| `upgrade` | An upgrade id the player has (for example `bootleg-hooch`) |

## 4. Triggers

The banter service listens for these. Some come straight from domain events, and some it *derives* from events plus the read-only game view (see the open question at the end).

| Trigger | Source | Speakers | Priority |
|---|---|---|---|
| `CycleStarted` | Domain event | Adama (always). Starbuck, a couple of lines, `chance` 0.25 | normal |
| `FtlSpoolProgress` | Derived (spool clock) | Gaeta (Galactica), Dualla (fleet readiness) | critical |
| `BigRaiderEntered` | Domain event | Adama | normal |
| `ResurrectionShipArrived` | Domain event | Adama | normal |
| `ResurrectionShipMilestone` (75, 50, 25 percent) | Domain event | Adama, Gaeta | normal |
| `ResurrectionShipDestroyed` | Domain event | Adama, Starbuck | normal |
| `RaiderResurrected` (first time, or repeat offender) | Domain event | Starbuck | flavor |
| `MultiKill` | Derived | Starbuck | flavor |
| `CloseCall` | Derived | Starbuck | flavor |
| `MissileLaunched` | Domain event | Starbuck | flavor |
| `FleetHit` (strafe or stray) | Domain event | Gaeta | normal |
| `HullLow` | Derived | Tigh | normal |
| `KillDrought` (long stretch without a kill) | Derived | Tigh | flavor |
| `UpgradeOffered` (per card) | Domain event | Baltar, Roslin | normal |
| `SpecialUsed` | Domain event | Adama | normal |
| `FleetLost` | Domain event | Adama | normal |
| `RunWon` | Domain event | Adama | normal |
| `ImaginarySixActive` | Derived | Tigh, Adama, Gaeta ("Who are you talking to?") | flavor |
| `CycleRecovering` | Domain event | *Scenes only, see below* | normal |

## 5. Scene (Recovering)

Scenes fill the 8 to 12 second calm between cycles. Two portraits trade lines.

```json
{
  "id": "scene-recover-clean-04",
  "trigger": "CycleRecovering",
  "when": { "damageBand": ["clean"] },
  "weight": 1,
  "beats": [
    { "speaker": "tyrol",  "text": "Not a scratch on her. I'm suspicious." },
    { "speaker": "adama",  "text": "Take the win, Chief." },
    { "speaker": "dualla", "text": "Next jump in 33 seconds." }
  ]
}
```

- 2 to 4 beats. Each beat is up to 72 characters.
- Tyrol should appear in most scenes (he anchors the recovery), and the closing beat should point at the next jump.
- Scene duration comes from the same reading-time formula as lines, capped at 12 seconds in total. The check fails a scene that would run longer.
- **For now only the opening beat is said** (PRD 12.3, 2026-09-24): one line between cycles, not a conversation. Write the first beat so it stands alone. The other beats are kept, unread, until the owner decides whether to trim scenes to one line.

## 6. Upgrade flair

Cards show the joke in italics and the exact effect in plain text.

```json
{
  "id": "spoilers",
  "title": "Spoilers",
  "joke": "It was the Raider. It's always the Raider.",
  "plain": "Ghost blips show where they return. Shooting one delays it 3 seconds.",
  "advice": {
    "baltar": "Know where they come back? I love that. Very safe. Very good.",
    "roslin": "Knowing the next move is worth more than firepower."
  }
}
```

- `plain` must be accurate. It is the exact effect, never a joke.
- **Advice must be honest.** It may exaggerate personality, but never mislead about what the card does.
- The check requires every upgrade id in the game data to have flair, and every flair id to have an upgrade.

## 6a. Fleet names

The FLEET console names the ten hulls on the fleet line (PRD 7.4). Galactica is fixed; the other
nine are drawn at random each run from a pool, so writing more names than slots is the point.

```json
{
  "galactica": "Galactica",
  "civilianNames": ["The Slightly Leaky Freighter", "..."]
}
```

- `civilianNames`: at least 9, unique. About 25 or more keeps repeats between runs rare.
- Each name up to **28 characters**, so it fits one row of the console. Plain text, no markup or emoji.
- Original names only: **no ship names from the show.** Spoiler-safe, and the joke is the ship, never
  a person.
- **Owner ruling, 2026-09-24:** a name that only lands fully after later episodes (a nod, not a
  reveal) is fine. It must not tell a new viewer what happens; not getting the joke yet is okay.
- The placeholders in `src/content/fleet.json` are in square brackets so they are easy to spot.
  `check:content` checks the count, uniqueness, and length; it does not block on placeholders.

## 6b. End-screen lines

`src/content/endings.json` holds the end screen's headline and the line under it (PRD 5.4). One is
drawn per run for the outcome.

```json
{
  "won":  [{ "id": "won-01",  "note": "PLACEHOLDER", "headline": "...", "text": "..." }],
  "lost": [{ "id": "lost-01", "note": "PLACEHOLDER", "headline": "...", "text": "..." }],
  "mostKilled": {
    "text": "Most-killed Raider: #{identity}, {count} times.",
    "reactions": ["Still not over it.", "..."]
  }
}
```

- `won` is excited, `lost` is a funny kind of sad. At least one of each.
- **Keep ids stable.** A share link names its line by id. A link whose id is gone shows the first
  line of its outcome instead, so renaming is safe but changes old links.
- Headline up to **40 characters**, text up to **140**. Plain text, no markup or emoji.
- `mostKilled.text` is the fixed part of the joke stat. One of `reactions` is drawn per run and
  follows it after a space. At least one reaction, each up to **80 characters**. A share link names
  its reaction by **position**, so reordering or cutting the list changes the joke an older link
  shows (a position past the end shows the first one). Add new ones at the end.
- Placeholders: `{score}` and `{cycles}` in any line; `{identity}` and `{count}` in `mostKilled` and
  its reactions.
  `check:content` names any other placeholder, a duplicate id, or an overlong line.
- Delete `note` when a line is the owner's own.

## 6c. Training Run lessons

`src/content/training.json` is the whole Training Run script (PRD 5.5): the drill names, the
lessons, in order, and the debrief. Tyrol teaches and Starbuck heckles, but any speaker from section
2 works.

```json
{
  "drills": { "target": "Target practice", "live-fire": "Live fire" },
  "lessons": [
    {
      "id": "sim-first-kill",
      "trigger": "RaiderDestroyed",
      "when": { "cycle": 1 },
      "heading": "They shoot back",
      "focus": ["status"],
      "startsDrill": "live-fire",
      "recap": "A destroyed Raider comes back about six seconds later.",
      "beats": [
        { "speaker": "tyrol", "text": "See the blip where that drone died? It is downloading." },
        { "speaker": "starbuck", "text": "Your sim cheats." }
      ]
    }
  ],
  "debrief": {
    "heading": "Sim complete",
    "beats": [{ "speaker": "tyrol", "text": "..." }],
    "recapIntro": "The sim never got to these:",
    "grades": ["Certified: technically."]
  }
}
```

| Field | Rules |
|---|---|
| `id` | Lowercase letters, digits, and dashes, up to 40. Unique. |
| `trigger` | `TrainingStarted` (before the first tick, shown back to back), `CombatTime` (needs `when.seconds`), `RaiderDestroyed` (first non-heavy kill), `RaiderReturned`, `HeavyArrived`, `ViperHit`, `ViperEjected`, `FleetHit`, `StrayNearFleet` (the first stray round about 30 units above the fleet line), `StrafeFlagged` (the first Raider diving the fleet), `SpoolStarted`, `Recovering` (over the pick sheet, does not pause), `ShipArrived`, `ShipExposed`, `ShipDestroyed`. |
| `when` | Optional. `cycle` (whole number, that cycle only) on any trigger; `seconds` (into the fight) on `CombatTime` only; `repaired` (true or false) on `Recovering` only. |
| `heading` | Up to **28** characters. |
| `focus` | Optional list, each once. HUD elements: `clock`, `fleet` (fleet health), `status`, `objective`. Playfield: `fleetLine` (the row of ships) and `subject` (the round or Raider that set the lesson off; `StrayNearFleet` and `StrafeFlagged` only). A lesson with a playfield focus docks at the top of the lane. |
| `interrupt` | Optional, `true` or `false`. `true` lets the lesson stop the fight inside the 3-second gap after a resume, so the thing it names is still on screen. Use it sparingly: each one is a stop right after a 3-2-1. |
| `startsDrill` | Optional. A drill id from `drills`. When this lesson is read, the sim switches to that drill's swarm (`src/balance/training.json`). |
| `recap` | Optional, up to **140**. The debrief line when the lesson never came up. Leave it off for lessons that always happen. Not allowed on `TrainingStarted`. |
| `by` | Optional, with `fallback`. `{ "cycle": 1, "seconds": 20 }`: if the trigger has not happened by then, the lesson shows anyway, outlining nothing in the playfield. Only on `RaiderDestroyed`, `RaiderReturned`, `HeavyArrived`, `ViperHit`, `ViperEjected`, `FleetHit`, `StrayNearFleet`, `StrafeFlagged`, and the three `Ship` triggers. |
| `fallback` | With `by`. The lines shown at the deadline instead of `beats`, worded for a moment that has not happened ("If a round gets past you..."). Same rules as `beats`. |
| `beats` | One to **4** lines, each up to **200** characters. Placeholders: `{cap}` (the fleet's damage cap per cycle), and `{before}` and `{after}` (the last jump's repair, in whole percent). |

- A lesson fires once per run, the first time its trigger happens and its `when` holds, or at its
  `by` deadline with its `fallback` lines. Lessons due at the same moment queue and show in file
  order. A lesson with a deadline always shows, so its `recap` is only read if the run ends first. Fight lessons wait 3 game seconds after the fight resumes, unless marked `interrupt`.
- `drills` names each drill for the status row (`Sim · Live fire`), up to **20** characters. Every
  drill in `src/balance/training.json` needs a name there. What a drill throws at you (`cap`,
  `floor`, `sineShare`, `attackTokens`, `strafeTokens`; left out means the tier's own number, and
  `{}` is the tier as it is) lives in that balance file, with `firstDrill` for the start.
- The debrief `grades` are drawn one per run. Beats there take no placeholders.
- Plain text only, no markup or emoji. A line over a length limit still plays; `check:content`
  names it. Markup, an unknown speaker, a bad trigger, or a placeholder nothing fills drops the
  whole lesson from the game, and `check:content` names that too.
- Every line in the file is a placeholder until the owner's content pass.

## 7. Coverage targets for the MVP

Roughly 150 to 200 lines. Write in batches of about 20.

| Speaker | Content | Target |
|---|---|---|
| Adama | Cycle start, big Raider, ship arrival, milestones, Speech, victory, defeat | about 25 |
| Starbuck | Occasional cycle start (`chance` 0.25), multi-kill, close call, resurrection, missile, hull | about 25 |
| Gaeta | Spool progress at several thresholds, fleet-hit reports | about 17 |
| Dualla | Readiness counts at several thresholds, status | about 13 |
| Tigh | Low hull, kill drought, grumbles | about 8 |
| Baltar | One line per MVP upgrade card, plus general panic | about 16 |
| Roslin | One line per MVP upgrade card, plus general strategy | about 16 |
| Tyrol | Hull-reset lines | about 8 |
| Six | Whispers, and the "who are you talking to" replies from others | about 10 |
| Scenes | 12 across the three damage bands | 12 |

The number of variants per trigger matters more than the total: a trigger players hit every cycle needs at least 5 or 6 variants, or repetition shows up fast.

## 8. Review checklist (every line and scene)

- [ ] Original, not paraphrased from show scripts
- [ ] Spoiler-safe up to the cutoff in the voice guide
- [ ] No implication that a specific named character is a Cylon
- [ ] Kind: aimed at the show's quirks, not the cast, the community, or real people
- [ ] In voice for the speaker
- [ ] 72 characters or fewer, plain text, valid placeholders
- [ ] Honest, for upgrade advice

## 9. Open question for the domain spec

Several triggers are *derived* (`MultiKill`, `CloseCall`, `HullLow`, `KillDrought`, `FtlSpoolProgress`, `ImaginarySixActive`). Recommended: **the banter service derives them from basic domain events plus the read-only game view**, so the domain never carries joke-shaped events. The domain spec should confirm this, and confirm the domain exposes what the service needs (spool time left, hull, recent kill times).
