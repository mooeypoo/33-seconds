# 0052 — Twice the pixels

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 4, item 4.0 (art at scale)
**Ends with:** a Viper you can actually see, drawn from the owner's own 64 × 64 file without shrinking it.

---

## What we set out to do

The owner drew a 64 × 64 Viper and the game squeezed it into 16 world units. On a monitor that was a
fighter about the size of a fingernail, and the old art notes asked for a 24-pixel redraw to match.
The owner wanted the opposite: bigger ships, and a title logo that is not accidentally blocky.

## What we decided

**Two numbers, not one.** How big a ship is on screen is its size in world units. How much detail it
has is how many art pixels go into each unit. We kept the world the same size (270 × 480 on a phone)
and drew the canvas at two pixels per unit. The domain did not change: the camera zooms 2× over a
canvas twice the size of the world.

**The owner's files fit as they are.** At two pixels per unit the 64 × 64 Viper is 32 units, the
48 × 48 Raider 24, the small explosion 32. Nothing already drawn needs redrawing, and
`docs/art/SPRITE-FILES.md` now lists only what is left, at those sizes.

**One fighter size.** The desktop's quarter boost existed because the ships were too small. Now
they are not, so a phone and a wide window use the same size. The wider lane stays.

## What we measured

The simulator, 60 runs a row, Viper Pilot:

| | Hunter wins | Idle pilot loses | Idle kills |
|---|---|---|---|
| Before (16 / 12 units) | 82% | 65% | 28 |
| Hitbox = whole Raider picture (12) | 90% | 35% | 72 |
| Shipped (Raider circle 10) | 92% | 40% | 66 |

Bigger ships are easier to hit, and that is most of it: a Raider now covers twice as much of the
lane, so even a parked Viper's gun finds them. Shrinking the Raider circle from 12 to 10 barely moved
the numbers (the difference is inside the noise), so the circle is not the lever. We kept 10 because
a shot past the wingtip should miss.

The Viper's circle went from 6 to 8, a quarter of its new picture. Ejects went up slightly.

- Unit tests: 240, all passing. The hitbox test now reads as the rule: a shot through the wing hits,
  one past the wingtip misses. A sabotage each way (5 and 12) proves it.
- Four seeded tests assumed an idle Viper never hits anything. The bigger Raiders drift into its
  column, so those tests now hold the gun (`viperFires: false`) and say why.
- Guardrails: 67 sabotages, all caught.
- End-to-end: 49 passing on desktop and phone.

## What surprised us

How little the domain cared. The rules never knew about pixels; only three presenters and the
scene's camera changed, plus the size constants.

## What is still open

A playtest. The run is easier than before. If it is too easy, the levers are in the tier data
(more Raiders, more attack tokens), not the hitboxes.
