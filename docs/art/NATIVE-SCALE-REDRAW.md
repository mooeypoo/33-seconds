# Native-scale redraw

**Status:** agreed 2026-09-24 (ADR-0002, owner decision 3). The code switch is ADR-0002 Phase 4.
This replaces the "draw at 4× and let the game shrink it" rule in [SPRITE-FILES.md](SPRITE-FILES.md)
and ART-DIRECTION 5 for everything listed here.

## Why

Today a 64 × 64 Viper is shown at 16 × 16 and a 48 × 48 Raider at 12 × 12. Nearest-neighbour keeps
one pixel in sixteen, so the detail in the files never reaches the screen and the edges shimmer as
ships move. A pixel game looks right when every pixel on screen is the same size. That means
drawing each sprite at exactly the size it is shown, and letting the game scale the whole world
up by whole numbers.

## Rules

- **Draw at 1:1.** The canvas size in the table is the file size and the on-screen size, in world
  pixels. No 4× file, no automatic downscale.
- A generated 4× hero is still fine as a *reference*. Repaint it by hand at 1:1. Do not shrink it
  with a tool.
- Same palette, same file rules otherwise (ART-DIRECTION 4 and 5): PNG, fully opaque or fully
  transparent, no anti-aliasing, anchor at the centre.
- Keep the file names in the tables, and save them to **`assets/native/`** with the same sub-folders
  (`assets/native/ships/viper_neutral.png`). The game keeps using the current files until Phase 4
  switches over, so nothing breaks in between.
- Even sizes centre between two pixels. That is fine. Keep the silhouette symmetric about that line.

## Assumptions (tell me if these change)

- The world stays 270 × 480 world pixels.
- One fighter size on phone and desktop: the desktop's 1.25 fighter scale goes away
  (UI and UX review, brainstorm 2). The owner deferred that decision, and whole-number scaling, to
  ADR-0002 Phase 4 (2026-09-24). If one size is rejected then, the Viper and Raider need a second,
  larger set; nothing else changes.
- The fighters get a little bigger than today (Viper 16 → 24, Raider 12 → 16). Hitboxes stay
  forgiving: the Raider's 8-unit radius already matches a 16-pixel drawing, and the Viper's hitbox
  stays smaller than its picture, as is normal in shooters.

## The list

Every file, its size, and where it goes is in the checklist in [SPRITE-FILES.md](SPRITE-FILES.md),
with a box ticked for each file that exists. That is the one place sizes live, so the two documents
cannot drift.

## Not changing

- **Portraits** stay 64 × 64. A desktop console may show them at 128 CSS pixels, which is exactly
  2×.
- **Title logo, card art, and HUD icons** are page pictures, drawn 1:1 and shown at a whole-number
  CSS scale. Sizes are in the checklist.
- **Starfield, FTL ring, Dradis sweep, stick indicator:** drawn in code.

## Order

Card art can come any time: Phase 2 shows a labelled slot until each file lands. For sprites, group 1
first, so the swap can be judged on a phone before the rest is drawn. Then the heavy Raider and the
resurrection ship, since Phase 3 needs them. Then the fleet, then everything else.
