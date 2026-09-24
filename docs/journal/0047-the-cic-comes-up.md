# 0047 — The CIC comes up

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 2, PR 2a (the CIC shell)
**Ends with:** a desktop that uses its whole screen. The fleet on the left, the lane in the middle,
the voices on the right, and a title that is the same room with the lights down.

---

## What we set out to do

Build the approved mock-up's shell: two consoles beside the lane on a wide window, the laptop's
collapse order, the phone's objective folded into the status row, and the title on the same shell.
The card pick waits for PR 2b.

## What we decided

**The lane never moves house.** Phaser mounts into one element once. The consoles and strips come
and go around it, but the element itself stays, so a window resized across 1100 px re-lays the page
without rebooting the game.

**Ship names are cosmetic, with their own stream.** Nine drawn per run from the owner's pool,
Galactica fixed in the middle, drawn from a stream derived from the run seed like comms, so a name
never changes the fight.

**The pause-menu log came forward.** The laptop console says the log is in the pause menu; shipping
that sentence before the log existed would have been a small lie.

## What we measured

- Unit tests: 213 (roster: slots, no repeats, seed variety, short pools; comms log: newest last,
  capped at twenty, empty for a new run).
- End-to-end: CIC tests at 1440 × 900 and 1280 × 720, the phone's objective chip, the pause log.

## What surprised us

**The comms log test found a real bug on its first run.** It checked that the newest logged line is
the one on the strip, and it was not: after Apply, the strip showed Baltar talking about a card from
the hand that had just closed. When the Recovering scene holds the strip, a line about the dealt hand
can still land underneath it; stopping the scene let it surface in the next cycle, where it made no
sense. It also bypassed the log. Ending Recovering now silences whatever is waiting under the scene.

**The debug readout was sitting on the Pause button.** It floated top right, which in the CIC shell
is exactly where Pause and About live, so a drag test starting "on the readout" landed on a button and
correctly did not steer. It moved to the bottom left.

## What is still open

PR 2b: the pick as cards. The owner's content review of a few ship names (spoilers, a show ship name).
