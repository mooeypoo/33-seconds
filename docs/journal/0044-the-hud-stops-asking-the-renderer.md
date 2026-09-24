# 0044 — The HUD stops asking the renderer

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 0, PR A (items 0.1 to 0.5)
**Ends with:** the same game on screen, with the plumbing underneath it moved to where the ADR
always said it lived.

---

## What we set out to do

Five fixes from the review that a player should not notice, except one card that now shows its
effect: the ghost bar, one way for a Raider to die, a HUD fed by the application layer, presenters
that read views instead of rule constants, and a game view built once per change.

## What we built

- **The ghost bar fills at its own pace.** A download now knows its whole wait, including *Spoilers*
  delays, and the view carries `progress`. With *Your Call Is Important to Us*, the bar used to sit
  empty for two seconds. The test that proved it was written first and failed first.
- **One `destroyRaider`.** The gun, the missile, and Imaginary Six each had their own copy of "emit
  the fact, queue the download, drop the body, count the kill." The next kill source would have
  been the fourth copy.
- **`HudViewModel`.** The session derives it from the game after every frame and hands it to the
  overlay. Before, Vue read a debug struct that Phaser built four times a second, so the HUD lagged
  up to a quarter second and needed a special case to catch the jump. The store copies the model
  field by field, so a frame where only the clock moved re-renders only the clock.
- **Presenters read views.** The audit found more than the ghost bar: hull, Raider, and Raptor pip
  counts, the chute's timing, the bank frames' idea of top speed, and Galactica's index. *Bootleg
  Hooch* lowers top speed, so the bank frames were measured against a speed the ship could no
  longer reach.
- **`Game.view` is cached** until the next state change. It was rebuilt, missile lock included, on
  every read, and the session, the HUD, and every presenter read it each frame.

## What we measured

- Unit tests: 200 before, 203 after. Two new tests for the bar, one extended for the eject, two for
  the HUD feed.
- Removing the HUD publish from `advance` fails the new feed test, and restoring it passes.
- `game.ts`: 1,174 lines before, 1,164 after. The real split is Phase 0.6.
- End-to-end: 41 passed on two full runs after the fix below. Release bundle unchanged
  (427.4 KB gzipped).
- `check:guardrails`: 55 of 55 sabotages caught.

## What surprised us

The chute used to start its own clock the first frame it saw an ejected Viper. It worked, but it
was a presenter keeping game time. The domain already knew how far through the downtime the pilot
was; it just never said.

**The guardrail proof had been failing quietly.** `check:guardrails` skips a sabotage whose anchor
text is gone, and counts it as unnoticed. Two anchors (*Raptor Escort* never launches, *Imaginary
Six* never appears) had not matched since the wider-lane slice added a width argument, so the proof
was already failing on `main`. This slice moved two more anchors. All four now match the code again.

**A pause test was racing the readout.** "About pauses" failed once in a full parallel run and
passed 20 of 20 alone. It waited a fixed 400 ms for a readout that the renderer refreshes four
times a second, and under load the first read could still be from before the pause. Both pause
tests now wait until two reads agree. If the game never paused, they still fail.

## What is still open

PR B: splitting `Game` into domain services, a `CommsDirector`, the content check, and the random
streams once ADR-0002 D1 is decided.
