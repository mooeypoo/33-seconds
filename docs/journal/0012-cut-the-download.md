# 0012 — Cut the download

**Date:** 2026-09-21
**Slice:** fourth slice of M3
**Ends with:** a resurrection ship you can kill, and a win when the last Raiders are gone.

---

## What we set out to do

Strafing is in. The next M3 stake is the reason the swarm is endless: a resurrection ship
that arrives around cycle 4. Destroy it, the downloads stop, clear what is left, the run ends.

Not in this slice: a path, opening bays, panic stages, the ship's own FTL, slow-mo on the
kill, the lose screen, flak, or restyling the strafe line.

## What we built

- **Parked hull, 60 HP.** High on the right. A slow, seeded side-to-side wander so it is not a
  sticker. HP survives the jump. Tests can start it on cycle 1 and with 1 HP so a kill is not a
  four-cycle wait.
- **Shielded first look.** Arrives on cycle 2 behind a still glass bubble; shots splash and
  do nothing. Shield drops on cycle 4. Both cycles are named constants plus GameOptions.
- **No more new downloads** once it is down. Pending ghosts still finish. Live Raiders at a
  jump come back as that last wave, so jumping is not a shortcut. HUD `loop` vs `offline` is
  the placeholder tell; greying leftover blips waits for the graphics pass.
- **Win overlay.** Placeholder copy. Continue returns to the title; Launch starts a new run.

## What we assumed

- 60 HP is about two to three cycles of focused fire if maybe a third of the shots land.
  Play will retune it.
- A slow wander is station-keeping, not a path. The fleet stays a rigid line until a later
  idle pass (slight up/down and a little sideways).

## What we tested

Arrives when asked, absent before; shielded until the vulnerable cycle, then HP dents;
it drifts but stays near home, and the same seed repeats the path; HP persists; new
downloads stop and the last wave still returns; a jump after the kill is not a win;
RunWon only on an empty sky; the session freezes, ignores pause, and Launch is a new
Game. Four sabotages: downloads that ignore the wreck, a win while Raiders remain, a
shield that still takes hits, and a ship that never leaves its sticker.

## What is still open

1. Viper Pilot numbers, so a player who ignores the fleet can actually lose.
2. Flak, retry-from-last-jump, epilogue.
3. Mid-cycle life pickups, with the bonus cards.
4. Straight-down fire, if bodyguarding still feels like a fast eject.
5. A quiet FTL border when 10 or 5 seconds remain.
6. Graphics: dive tell, grey leftover ghosts and the wreck when the loop is offline (ART-DIRECTION §9), fleet idle motion.
7. Ship path, bays, panic, escape FTL, slow-mo.
