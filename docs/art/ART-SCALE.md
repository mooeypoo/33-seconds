# Art scale

**Status:** decided 2026-09-24 (ADR-0002, owner). Replaces the "native 1:1" plan and the older "draw
at 4× and let the game shrink it" rule. The file list, with sizes and what exists, is the checklist in
[SPRITE-FILES.md](SPRITE-FILES.md).

## The short version

- **Draw every playfield picture at exactly the file size in the checklist.** No bigger file to be
  shrunk, no smaller one to be stretched.
- **The game shows two art pixels per world unit.** A 64 × 64 Viper file is a Viper 32 world units
  across. The whole world then scales to the screen.
- **One size on every screen.** The desktop no longer draws fighters a quarter larger.
- Your existing **Viper (64 × 64)**, **Raider (48 × 48)**, and **small explosion (64 × 64)** already
  fit and stay as they are.

## Why two art pixels per world unit

Two separate things decide how the ships look:

1. **How big a ship is on screen** is how many world units it spans. The world is 270 units wide on
   a phone and 324 on a desktop, and it is stretched to fit the screen. The Viper spans 32 units:
   about 53 CSS pixels on a 1440 × 900 desktop and 46 on a phone, roughly an eighth of the lane.
2. **How much detail it has** is how many art pixels go into each world unit. At two per unit, the
   detail shows on the screens people actually play on:

| Screen | Screen pixels per world unit | Screen pixels per art pixel |
|---|---|---|
| Phone (about 3× density) | about 4.3 | about 2.2: crisp, all the detail shows |
| Laptop or Mac (about 2× density) | about 3.3 | about 1.7: crisp |
| Plain 1080p monitor (1×) | about 1.7 | about 0.8: very slightly softened |

Drawing at one art pixel per unit would look chunkier everywhere and waste a phone's sharpness. Four
per unit (the old rule) threw most of the pixels away.

## Rules

- **Draw at the checklist's file size.** A generated hero at a larger size is fine as a reference:
  repaint it at the file size by hand. Do not shrink it with a tool; that blurs or drops pixels.
- **Same palette and file rules** (ART-DIRECTION 4 and 5): PNG, fully opaque or fully transparent,
  no anti-aliasing, anchor at the centre, hot red for Cylons only.
- **Keep every picture at the same density.** A shot drawn at 12 × 20 when the list says 6 × 10 would
  have pixels half the size of the ship's, and it would look out of place.
- **Page pictures are different** (portraits, card art, HUD icons, the title): they are shown in the
  HUD and menus at a whole-number CSS scale, with their own sizes in the checklist.
- **The title uses the 64 × 64 Viper at exactly 2×** (128 CSS pixels), so it stays sharp.
- Put each file at the path in the checklist. A redrawn file replaces the old one at the same path.

## What the game does with it

The renderer draws the world at two pixels per unit, and the rules stay in world units. Hitboxes stay
a little smaller than the pictures, as is normal in shooters, so a graze that looks like a miss is a
miss. Bigger pictures are also bigger targets, so the numbers are re-checked with the simulator.
