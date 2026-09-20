# 0003 — Something shoots

**Date:** 2026-09-20
**Slice:** third slice of M1
**Ends with:** the Viper firing on its own, and one Raider flying down the world that you can
shoot.

---

## What we set out to do

M1 said "fly and shoot." The first two slices covered flying. This one is the gun and the first
thing it can hit.

Not in this slice: Raiders that shoot back, Viper hull and eject, resurrection, the 33-second
cycle, missiles, or a Director. Those are M2 and later. The screen has to stay a shooting gallery
with one target, not a loop.

## What we built

- **Auto-fire**, always on, no button. The gun points at the swarm side (up) and does not track a
  target. That follows the fixed heading (PRD decision 13) and is now written into section 8.1 so
  missile cone-targeting in M4 is not read back into the gun. Starting rate: 5 shots per second.
- **Shots in the domain.** A small recycled pool (cap 12), swept circle collision so a round that
  leaps a Raider in one tick still counts, and despawn at the top of the world.
- **One Raider.** Spawn column comes from the scenario stream, so the same seed puts it in the same
  place. Three hits to destroy. A new one appears after 1.2 s. If it flies off the bottom it
  reappears at the top of the same column: a placeholder until fleet damage exists, not
  resurrection, and not a kill.
- **Presenters.** Green placeholder rounds; an arrowhead hull with a slow sweeping red eye and
  three HP pips (count plus colour, never colour alone). The sweep is a tween on the game clock, so
  pause freezes it. Reduced motion keeps the eye and drops only the sweep.

## What we assumed

- Play uses seed `1` until a run-start seed exists. That makes the first Raider's column
  repeatable while we have nothing to roll a seed from.
- A Raider that leaves the bottom is sent back to the top of its column with its HP intact. Until
  M3, there is no fleet to hurt.
- The 1.2 s gap after a kill is only so the kill is visible. It is not the 6 s download.

## What surprised us

**Holding a column is work, because the Viper has mass.** The first kill test aligned under the
Raider and then let go. The Viper coasted off the column and every shot missed. That is the
movement from slice 1 doing exactly what it promised, and it is also why "sit still and shoot"
is not a thing this ship can do. The test now keeps a gentle steer on the column, which is what a
player would do.

**Spawn and move happen in the same tick.** A test that asserted the Raider was still on its spawn
Y after `tick` was wrong: the first tick also advances it. The view after a tick is the state at
the *end* of the tick. Worth remembering for anything we spawn later.

## What we tested

Fire rate (five shots in a second of idle intent, none of them sideways), shots leaving the world
without leaking, the same seed placing the Raider in the same column, a wrap that is not a kill,
a real destroy then a respawn with a new id, and swept collision on a leap that endpoint-overlap
would miss. Three new sabotages: cooldown ignored, sweep replaced with a landing-spot test, hits
that no longer reduce HP. An end-to-end check that Launch puts a shot on screen without a fire
button.

## What is still open

1. **The phone check**, now with something to shoot at. Feel of fire rate and Raider speed is the
   thing to judge, not just frame rate.
2. **Raider hitbox.** First play on a desktop phone-view found the 6-unit circle tight. We left it:
   one target on a scaled preview is not enough to tell a real miss from a scaling quirk. Revisit
   once there is a swarm and time on a real phone (PRD 8.4).
3. **M2**: the loop. Director, Raiders that shoot, hull and eject, ghosts, the 33-second cycle.
4. **The debug readout** is still how tests see kills and shots. It goes when the real HUD arrives.
