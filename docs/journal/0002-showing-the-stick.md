# 0002 — Showing the stick

**Date:** 2026-09-20
**Slice:** second slice of M1
**Ends with:** touch controls you can see. A ring where your thumb landed, a dot showing which way
you are pulling and how hard, and a line telling first-time players to drag at all.

---

## What we set out to do

The previous slice shipped a drag stick that worked and was completely invisible. On a phone that is
close to unplayable: nothing tells you that touching the screen flies the Viper, and once you are
dragging, nothing tells you which direction you are asking for or how much of full speed you are
getting. The owner caught it, which is the part worth noting — the PRD had covered it in a single
clause ("a faint pixel ring and dot show the origin"), and a single clause is easy to skip.

So the clause became rules (PRD 13.2), and this slice built them. Not in this slice: auto-fire,
Raiders, and remembering "hint seen" across visits, which needs the storage seam scheduled for M5.

## What we built

- **`StickPresenter`**, which draws the ring and the dot. It reads the input adapter's state, not
  domain state, because where a thumb landed is a fact about the device rather than about the world.
  The dot stops at the ring so that pulling harder than full speed does not run off the edge: the
  ring is a promise that this is as fast as it gets. Inside the dead zone the dot sits centred and
  dim, so "not moving yet" looks deliberate instead of broken.
- **`stickVector`**, the stick's feel extracted into a pure function: dead zone, analog ramp, clamp.
  It lives in the adapter but is tested directly in Node, because this is the part players feel and
  the part a refactor can quietly ruin.
- **A first-run hint**, "Drag anywhere to fly", shown on touch devices until the first drag. It is
  text with no timer and no button, and it is not marked `data-ui`, so a thumb landing on the hint
  still steers. Dismissal is in memory until storage arrives, which is the fallback the PRD already
  describes for storage being unavailable.

## What surprised us

**The ring rendered nothing, and both obvious explanations were wrong.** First suspicion: Phaser 4
does not draw stroke-only shapes. Second: the negative depth that puts the indicator behind the ships
also puts it behind something opaque. Both were tested by making the indicator deliberately loud
(magenta, filled, depth 5) and then walking it back one property at a time. Stroke-only draws fine.
Negative depth draws fine. The actual cause was mundane and worth remembering: **a one-pixel stroke at
0.35 alpha in the muted HUD blue is invisible against the near-black of space.** "Faint" is a design
instruction that still has to clear the contrast floor. Two pixels at 0.55 reads as quiet without
competing with anything, and the constants now carry a comment saying the numbers came from looking at
a screen rather than from taste.

Useful by-product of the walk-back: the coordinate conversion from CSS pixels to world units was
verified visually. The loud ring landed exactly under the synthetic touch, which is a better check
than any assertion we could write cheaply for canvas contents.

**Our end-to-end tests were flaky by construction, and the cause was interesting.** Two tests failed
intermittently. The failure page showed the Viper at 142 while the assertion had read 135: the game
had moved, and the test had read a stale readout. The readout refreshes four times a second, and the
tests slept a fixed 350 ms and hoped. Worse, under load the game legitimately runs slower than real
time, because the loop drops backlog instead of catching up — so *any* fixed wait is a race. Every
helper now polls for the state it needs and the suite ran clean three times in a row.

**The fps number in the debug readout was lying.** Chasing the flakiness turned up a readout claiming
60 fps on a page that was plainly running at a fraction of that. We were counting frames against the
delta Phaser hands to `update`, and Phaser smooths and clamps that delta, so the arithmetic reports
what the loop *wanted* rather than what the browser *did*. It now reads `game.loop.actualFps`, which
is timed against the real clock. This mattered more than it looks: the whole point of that number is
the phone check, and a reassuring lie would have made a struggling phone look fine.

## What we tested

Five unit tests on `stickVector`: the dead zone swallows a resting thumb, strength ramps from the dead
zone to full at the ring, dragging twenty times past the ring still asks for exactly full speed, the
direction follows the finger, and a diagonal is one direction rather than two added together. Two new
sabotages in `check:guardrails` remove the dead zone and the clamp; both are caught. The end-to-end
suite gained the hint flow on emulated mobile, and all of it was re-run after the polling rewrite.

The ring and the dot themselves are verified by eye, as pixels always will be. The screenshots in this
slice were how the contrast problem was found in the first place.

## What is still open

1. **The phone check**, unchanged and now more worth doing: the controls are finally visible, so trying
   it on a real device tells us something about feel rather than only about frame rate.
2. **Remembering the hint** across visits, with the M5 storage seam.
3. **The debug readout** is still the tests' only window into the simulation, and still due to be
   replaced by the real HUD.
4. **Auto-fire and the first Raider**, which is the rest of M1.
