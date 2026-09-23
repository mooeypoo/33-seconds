# 0029 — The deck is still talking

**Date:** 2026-09-22
**Slice:** Recovering scenes, and someone noticing Imaginary Six
**Ends with:** a conversation over the card table that has to finish, and a question the first time she is on the wing.

---

## What we set out to do

The calm between cycles is a short scene, two people trading lines, picked from how the
cycle went. The player can choose a card while it plays. The next cycle starts when the
scene has finished and a card is chosen. There is still no timer.

Once each time Imaginary Six appears, someone asks who the pilot is talking to. That
line waits for an empty strip, so it does not talk over Adama.

Not in this slice: Starbuck answering that question, Six's own portrait, the comms log,
the duration setting, and the other derived quips.

## What we built

- Three scenes were already written. Clean, rough, and wrecked. The jump repair used to
  wipe the damage before Recovering could see it, so the fleet and the Viper now remember
  the cycle that just ended.
- Wrecked is 16 fleet damage, or 3 hull, or an ejection. A download that puts the pilot
  back still counts. Those two numbers are assumptions.
- Four beats at the usual reading time run past 12 seconds, so a long scene shrinks and
  still says every line. The strip shows the previous speaker beside the one talking.
- A tap during the scene is marked Chosen. Another tap can change it. Ask Baltar Again
  clears it.

## What we assumed

One scene per band is enough until more are written. The joke about the hand still
exists, and the scene is the voice you hear while the cards are up.

## What we tested

A wrecked scene says all four lines and ends at 12 seconds. A pick during the scene
does not start the next cycle; twelve seconds later, it does. The Six line does not
replace a line that is already up, stays quiet at 1 hull, and does show once the strip
is empty. A damaged cycle is still wrecked or rough after the repair has run.

## What is still open

1. **Soon:** JSON objects per difficulty, before a third tier.
2. **Soon:** share a finished run.
3. **Later:** a harder return after a win.
4. **Later:** wingman guards, decided together with who the lines address (PRD 12.5).
5. Derived quips (a kill streak, a close call, a fleet hit), the comms log, the duration setting.
6. AudioPort and the first sound.
7. Full settings screen (M6).
8. Retry-from-last-jump, epilogue.
9. Mid-cycle life pickups.
10. Straight-down fire.
11. A quiet FTL border when 10 or 5 seconds remain.
12. Graphics pass.
13. Ship path, panic, escape FTL, slow-mo.
14. Missile pickups, blast radius, Later cards.
