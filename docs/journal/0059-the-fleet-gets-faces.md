# 0059 — The fleet gets faces

**Date:** 2026-09-27
**Slice:** the owner's first art pass lands: civilian ships, Galactica, the Raptor, Imaginary Six,
the ejected pilot, and all twelve upgrade cards, plus three fixes that playing with the new art
asked for.
**Ends with:** every ship in the fleet drawn, every card illustrated, disabled ships crossed out,
the strafe tell reading as "incoming" instead of "laser", and a requisition card that selects
wherever you click it.

---

## What we set out to do

This slice had no plan up front. The owner drew assets in batches, and each batch went straight
into the game to see how it looked. Most of the work was wiring. The interesting part is what the
pictures showed us once they were in place: two size rules that did not survive contact, a
brightness problem nobody could see in the drawing program, and three bits of UI that had been fine
as placeholders and stopped being fine next to real art.

## What we built

- **Civilians.** Three designs, `civilian_1` to `civilian_3`, each with a dented pair. The owner
  numbered them instead of lettering them, so more can follow. A ship keeps one design for the whole
  run, taken from its place in the line, so neighbours differ and no random stream is involved.
  Adding a fourth design is two imports and one entry in `CIVILIAN_VARIANTS`.
- **Galactica as a nose.** The owner's idea: draw only the front of Galactica, pointing up, rising
  out of the bottom edge of the screen, as if the rest of the ship were off screen. It looks huge
  without taking the width of the line. The file is 64 × 76, and the line crosses it 36 px up from
  the bottom, so 4 px hide below the screen edge.
- **A wider slot, and hits by hull.** Galactica's slot is wider by exactly its extra width, so every
  gap in the line is the same: 5.8 units on a phone, 11.2 on a desktop. A stray used to mark the
  ship with the nearest *centre*. With a wide Galactica, that marked the civilian beside it for a
  round that visibly hit Galactica's wingtip. Now it marks the hull the round lands on.
- **Layering.** Galactica draws below the Raiders, so a strafer diving at the line is never hidden
  behind the nose. The fleet line runs behind it.
- **The Raptor and Imaginary Six** draw from their pictures. Six's glow is part of her file, so the
  code-drawn glow circle went. The Raptor's hull pips moved from under it to above it, like the
  Viper's and the Raiders'. Underneath, they sat on the civilians.
- **A dark rust X on disabled ships.** After a couple of rounds the owner found the dented pictures
  hard to tell from healthy ones at a glance. Each disabled hull now gets a small, still X with a
  dark rim.
- **Down arrows for the strafe tell.** Players read the orange line from a strafer to the fleet as a
  laser. It is now a column of small "v" arrows with a slow brightness wave rolling toward the fleet.
  The arrows are fixed to the screen, so the column shrinks as the Raider closes in.
- **Card art at full screen sharpness,** and a card that selects wherever you click it.

## What we decided

- **Ships stay at two art pixels per world unit.** The owner's first question: the civilians lost
  all detail when exported at 32 × 16, so could they be drawn bigger and scaled down on screen? It
  is a fair instinct. A civilian covers about 70 real pixels on a 3× phone. But the game draws the
  whole world into a canvas at 2 art pixels per unit *before* the browser stretches it, so a 64 × 32
  file gets squeezed back to 32 × 16 inside the canvas. With nearest-neighbour scaling, that throws
  away every other pixel, which is worse than drawing 32 × 16 by hand. The detail limit is the
  canvas, not the screen. We kept the rule, and the answer was to redraw at the file size.
- **Rust, not red, for the X.** The owner asked for a red X. The PRD says only Cylons are red, so
  we asked. Dark rust keeps the rule and still reads as damage, next to the orange hit notch.
- **Card art is the one exception to pixel art.** The checklist asked for 112 × 36 banners shown at
  3×. The owner suspected that would look coarse, and it would. Card banners are page pictures, not
  canvas, so the browser can show more. The size that fits is **672 × 216**: one file pixel per
  screen pixel on a 2× desktop (the banner is 336 CSS px wide) *and* on a 3× phone (224 CSS px).
  Anywhere else, the browser shrinks it smoothly. The catch is that smooth scaling means soft edges,
  which the art rules ban, so card art is now the named exception in ART-SCALE, and ADR-0002's
  112 × 36 decision is marked superseded.
- **Six moved out.** Her drawn picture is 16 units wide; the placeholder was 8. At the old 18-unit
  offset she overlapped the Viper by about 5 units (the Viper's art is 30 units wide, measured from
  its bounding box). She now flies 26 units out, so her beam starts 8 units further away. Against
  a 140-unit range, that is barely a change.

## What we measured

- **Semi-transparent pixels, per file.** The first civilians had 143 to 195 each, most of them a
  purple fringe left by the export. That shows in the game as a faint purple halo. After a
  re-export: zero. The pilot went from 125 to zero. Six keeps 660 on purpose: they are her glow.
- **Brightness, as contrast against the space colour** (median pixel, WCAG-style ratio): Viper
  3.75, Raider 2.5, civilians 1.7 to 2.7, Galactica **1.54**, dented Galactica 1.38. The owner's
  "too dark?" was right. Test copies with the mid-tones lifted reached 2.06 and 2.78. The
  recommendation is about 2.5, with the darkest panel lines left alone. That is still open.
- **Card file weight.** 107 to 148 KB each, 1.5 MB for all twelve. They use 2,986 to 12,472 colours
  each, so re-saving them as indexed PNGs would lose quality. Only the three cards on offer are
  fetched at each pick, and the browser keeps them after that, so we left them as they are.
- **Tests.** Four new tests guard the fleet line: one even gap with no overlap at both widths, and a
  wingtip round landing on Galactica. Reverting to nearest-centre broke one; reverting to even slots
  broke three. The card-click fix extends an end-to-end test, which fails with the old handler.
  367 unit tests pass.

## What surprised us

- **A card was silently missing its art.** One file was `anyone-can-be-a-cylon.png`; the card's id
  is `anyone-could-be-a-cylon`. The art is loaded by file name, so the card would simply have shown
  an empty slot, with no error anywhere. We renamed the file. A check that every file in
  `assets/cards/` matches a card id would catch the next one.
- **The first screenshot of the X was pure black.** The script waited for fleet health to drop to
  60%, and by then the run had jumped to the card-pick screen. Taking the shot the moment fleet
  health hit 80% worked. It is a small lesson in how long a 33-second cycle is.
- **The clickable part of a card was only its top half.** The face was a button around the rarity,
  banner, title, and joke. The effect and the advisors sat outside it, and on a desktop card that is
  half the card. The owner found it by clicking where people click. Nothing had been wrong with the
  button; it was just smaller than the card.
- **The 2026-09-21 changelog had already predicted the arrows.** "A directional light or
  descending-arrow look waits for the graphics pass." It did.

## What is still open

- **Galactica's brightness.** Aim for about 2.5 contrast. The dented version should stay a little
  darker than the whole one.
- **Two dark brick-red pixels** on the dented Galactica read as scorch marks. They may want to be
  brown, since red is for Cylons.
- **Galactica sits fifth of ten, not in the middle.** The bigger nose makes that easier to notice.
  The PRD's ship-name section calls it "the middle one". Moving it is a small change; the owner has
  not asked.
- **Six is the brightest thing on the playfield.** If she pulls the eye mid-fight, a slightly dimmer
  cream would calm it.
- **Seen only in still frames:** the arrows' shimmer (two frames a quarter-second apart), the X on
  Galactica (the automated runs never dropped below half), and the dented Galactica in play. They
  need a look in motion, on a real phone.
- **Art still missing:** the flak burst, the download blip, and the background Galactica silhouette.
