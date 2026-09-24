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
  (UI and UX review, brainstorm 2). If that is rejected, the Viper and Raider need a second,
  larger set.
- The fighters get a little bigger than today (Viper 16 → 24, Raider 12 → 16). Hitboxes stay
  forgiving: the Raider's 8-unit radius already matches a 16-pixel drawing, and the Viper's hitbox
  stays smaller than its picture, as is normal in shooters.

## Group 1: replaces what is on screen today (draw first)

| File | Size | What changes |
|---|---|---|
| `ships/viper_neutral.png` | 24 × 24 | Same design, repainted at 1:1. Keep the cockpit bump, spine, and wingtip fins as single-pixel details. |
| `ships/viper_bank_left.png` | 24 × 24 | Banked left. |
| `ships/viper_bank_right.png` | 24 × 24 | Banked right. |
| `ships/viper_flicker.png` | 24 × 24 | Neutral, engines one step brighter. |
| `ships/raider_eye_center.png` | 16 × 16 | Same design at 1:1. |
| `ships/raider_eye_left.png` | 16 × 16 | Eye one pixel left. |
| `ships/raider_eye_right.png` | 16 × 16 | Eye one pixel right. |
| `projectiles/bullet_player.png` | 3 × 5 | Hand-placed pixels. |
| `projectiles/bullet_aimed.png` | 3 × 5 | Red. |
| `projectiles/bullet_stray.png` | 3 × 7 | Orange, longer trail. |
| `projectiles/bullet_player_big.png` | 5 × 8 | **New.** *Overcompensating Cannon* round. Today the code scales the normal shot by 1.5, which cannot land on whole pixels. |
| `effects/explosion_small_1.png` … `_6.png` | 16 × 16 | Six frames, same rules as before (no white frames). |

## Group 2: new ships (placeholders today)

| File | Size | Frames | Notes |
|---|---|---|---|
| `ships/raider_heavy_eye_center.png`, `_left`, `_right` | 24 × 24 | 3 | Heavier arrowhead with visible bays. Same eye sweep as the Raider, so the animation code is shared. |
| `ships/resurrection_ship_sealed.png` | 48 × 32 | 1 | Bays closed. Chunky, original. The shield bubble is drawn in code. |
| `ships/resurrection_ship_open.png` | 48 × 32 | 1 | Bays split open, red well visible. |
| `ships/resurrection_ship_wreck.png` | 48 × 32 | 1 | Reads as a dead factory, not a parked target. Greys, no red. |
| `ships/civilian_a.png`, `_b`, `_c` | 16 × 8 | 1 each | Three silly silhouettes for the fleet line. |
| `ships/civilian_a_damaged.png`, `_b_`, `_c_` | 16 × 8 | 1 each | Same ship, visibly dented, so damage is not only a colour change. |
| `ships/galactica_fleet.png` | 24 × 10 | 1 | Galactica on the fleet line, slightly larger than the civilians. |
| `ships/galactica_fleet_damaged.png` | 24 × 10 | 1 | Dented. |
| `ships/raptor.png` | 16 × 8 | 1 | Olive, never red. |
| `ships/imaginary_six.png` | 12 × 16 | 1 | A steady outline figure. The glow is drawn in code. Costume and silhouette, not likeness. |
| `ships/pilot_eject.png` | 12 × 16 | 1 | Seat and chute. Never used for a download. |

## Group 3: effects, markers, background

| File | Size | Frames | Notes |
|---|---|---|---|
| `projectiles/missile_1.png`, `_2` | 4 × 8 | 2 | Flame flicker at 2 Hz or slower. |
| `effects/flak_burst_1.png` … `_3` | 8 × 8 | 3 | Warm olive and orange, never white or red. |
| `effects/explosion_large_1.png` … `_8` | 32 × 32 | 8 | Heavy Raider and factory. Same rules as small. |
| `effects/spark_1.png`, `_2` | 4 × 4 | 2 | Hit feedback at the impact point (Phase 3). |
| `markers/ghost_blip.png` | 8 × 8 | 1 | Dradis download marker. The fill bar is drawn in code. |
| `markers/returned_x1.png`, `_x2`, `_x3` | 6 × 6 | 1 each | Tally scratches above Returned Raiders. |
| `background/galactica_silhouette.png` | 160 × 48 | 1 | Dark, slow parallax behind the fight. Two or three space colours only. |

## Group 4: HUD icons (shown in the page, not the playfield)

Drawn at 8 × 8 and shown at a whole-number CSS scale (2× or 3×).

`icons/missile.png`, `icons/special.png`, `icons/hourglass.png`, `icons/hold_music.png`,
`icons/eye.png`, `icons/fleet.png`, `icons/ftl.png`.

## Not changing

- **Portraits** stay 64 × 64. A desktop console may show them at 128 CSS pixels, which is exactly
  2×.
- **Title logo** stays as described in SPRITE-FILES.md.
- **Starfield, FTL ring, Dradis sweep, stick indicator:** drawn in code.

## Order

Group 1 first, so the swap can be judged on a phone before the rest is drawn. Then the heavy Raider
and the resurrection ship, since Phase 3 needs them. Then the fleet, then everything else.
