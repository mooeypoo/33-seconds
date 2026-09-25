# 0057 — One drone at a time

**Date:** 2026-09-25
**Slice:** the Training Run builds up in drills, and stops once on the stray round (PRD 5.5)
**Ends with:** a sim that starts with one harmless drone, turns on live fire when you shoot it
down, and freezes the first stray round a moment before it hits the fleet, with both the round and
fleet health outlined.

---

## What we set out to do

Playtest feedback on the first Training Run was split. Some people loved it. A couple missed the
point of the game: what hurts the fleet. The fleet lesson pointed at the Fleet health bar, not the
ships at the bottom, and it came up a few seconds after the hit, when the round that caused it was
long gone. People also said the fight arrived all at once: moving, auto-fire, return fire, and
strafing in the same few seconds.

The owner's calls, made in chat: keep the 33-second cycle, always. Stage the sim in small steps
inside a cycle instead: one drone that does not shoot, then ones that do, then the rest. Stop once
on a stray round just before it lands, with the round and fleet health outlined, and let the player
watch it hit. Say that the fleet gets a little fixed up between cycles, and stop teaching the damage
cap, which will differ by difficulty. Name the drill in the status row. Build the staging as a
general mechanic, because a harder difficulty might want to alternate swarms one day.

Left out: shorter sim cycles, new art, any change to the lesson card's buttons, and a drill menu.

## What we built

- **A swarm override in the domain.** `Game.setSwarmOverride` replaces the tier's swarm ramps
  (cap, floor, weavers, attack and strafe tokens) from the next tick, mid-cycle, until it is
  cleared. The application sets it between ticks, like an intent, so a run still repeats from its
  seed. The domain does not know training exists. ADR-0001 D9 records it as the hook for
  alternating swarms later.
- **Drills as data.** `balance/training.json` lists them as swarm numbers: *Target practice* (one
  drone, holds fire), *Live fire* (up to three, one firing), *Full sim* (`{}`, the tier as it is).
  A lesson with `startsDrill` switches drills when it is read. Every drill starts with Tyrol saying
  so, and the status row reads `Sim · Live fire`.
- **Two new triggers read from the screen, not from events.** `StrayNearFleet` fires when the first
  stray round is 30 units above the fleet line. `StrafeFlagged` fires when the first Raider starts
  diving the fleet. Each remembers which round or Raider set it off.
- **`interrupt`.** The stray lesson may stop the fight inside the 3-second gap after a resume.
  Without it, the round would land before the card came up. That answers the open question from
  0056 for this lesson only; every other lesson still waits.
- **Outlines in the playfield.** Focus is now a list. `fleetLine` and `subject` are drawn by a small
  Phaser presenter as still amber lines, while the HUD outlines stay CSS.
- **A script rewrite, still placeholders.** Two opening cards instead of five. The clock lesson is
  folded into the spool lesson, which says every cycle is 33 seconds. Missiles and the Speech move
  to cycle 2, when there is more to use them on.

## What we measured

The same headless bot as 0056 (fly under the nearest Raider, read everything, take the first card)
on five seeds:

- It won every run, in three cycles.
- The first kill came within 3 seconds of the fight starting.
- The stray lesson came up 5.4 to 6 seconds into cycle 1, with its round on screen every time.
- A test resumes after that card and checks that the fleet takes a stray hit within half a second.

## What surprised us

- **The first screenshot of the stray lesson showed nothing.** The card sits low in the lane, and
  its dim covered the fleet and the round, which were the point. A lesson about the playfield now
  docks at the top and leaves the bottom undimmed.
- **An `interrupt` on the strafe lesson backfired.** Full sim flags a strafer on its very first
  tick, so the lesson stopped the fight one tick after the 3-2-1. Dives are slow, so the ordinary
  gap is fine there.
- **Briefing the full sim at 0 s into cycle 2 did not work.** The gap after Apply held the lesson
  for 3 seconds, and the old drill ran in the meantime. The briefing now sits on the pick sheet, so
  cycle 2 starts in the right drill with no extra stop.
- **The bot often ejects late in cycle 1.** It blocks every round on purpose, which a real player
  will not. The eject lesson simply comes up earlier for it.

## What is still open

- Real lines for the new and moved lessons (owner's content pass).
- The stray card has four lines. On a phone it covers most of the lane, but the fleet and the round
  stay visible. Shorter lines would help.
- Whether one drone is enough target practice, or two reads better. It is one number in
  `balance/training.json`.
- A phone playtest of the whole flow.
