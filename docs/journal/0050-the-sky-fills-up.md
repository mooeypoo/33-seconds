# 0050 — The sky fills up

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 3, PR 3b/3c (the swarm pass and the heavy Raider), as stacked commits
**Ends with:** four to six Raiders on screen where there were fewer than one, a heavy that arrives
from cycle 2, and every number that sets it in one JSON file.

---

## What we set out to do

The owner's answers to the gameplay brainstorm: always three to five on screen, downloads that keep
refilling at staggered times, straight dives with the occasional shallow weave, and a heavy Raider
with its own queue that never comes back. Tuned against the simulator from the last slice, not by
feel alone.

## What we decided

**The Director has a floor now.** The old rule was that a pending download holds its slot, so a
refill never adds pressure. It stays between the floor and the cap. Below the floor, fresh Raiders
come anyway. A finished download never passes the cap; it waits for a slot. That is a Core rule in
PRD 6 and 9, and it changed with the owner's go-ahead.

**The ship's death sends a last wave.** It tops the swarm up to the cap once, then nothing fresh.

**The heavy Raider is a Raider with a kind, not a second class.** Hit resolution, missile lock, and
the renderer already knew how to handle a Raider; they needed a radius and a missile damage per kind.
Its own queue, cap, and attack token live in the swarm and the schedule, where the rules are.

**No randomness where none is asked for.** Jitter at 0, a weave share of 0 or 1, and no heavies all
skip their draw, so every seeded test written before this slice kept its numbers.

## What we measured

Hunter bot on Viper Pilot, 60 runs: Raiders on screen **0.6 → 4.4**, wins **100% → 80%**, run length
**2.6 → 4.5 minutes** of bot time. An idle pilot now **loses 68%** of Viper Pilot runs, where PRD 7.3
says ignoring the fleet should be able to lose; it lost 2% before. Civilian Run still never loses.
Unit tests 221 → 236.

## What surprised us

**The first tuning was too much, and the ejects said so.** Cap to 8 and three attack tokens by
cycle 6 had the hunter ejecting three times a cycle and losing a third of its runs. Pulling the third
token to cycle 8 and the second diver to cycle 6 fixed the losses; the ejects stayed high, because a
bot that never dodges is not a player. That one waits for a playtest.

**One of the owner's numbers could never happen.** Heavies leave at the jump, so "at most two alive"
with one per cycle means one. Two per cycle, eight seconds apart, makes the two reachable.

## After the first playtest

The owner found it challenging but not conclusive, and the Cylons a bit too fast. Raiders now fly at
46 wu/s instead of 55, heavies at 30 instead of 35. The simulator barely moved (hunter wins 82% on Viper
Pilot, was 80%), which is what we wanted: more time to react, not an easier run.

## What is still open

A playtest of the numbers. The resurrection ship's HP and shield timing now decide run length, and
they are not in the tier data; the profile has one knob left. Phase 3 continues with hit feedback and
audio.
