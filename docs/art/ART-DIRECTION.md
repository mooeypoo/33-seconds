# Art direction

Status: **Draft for the owner to shape.** Everything marked *starter* or *proposed* is a suggestion to react to, not a rule.

Purpose: tell you exactly what to make, in which file format, and in what order, and let the implementing agent build the game with placeholders until your real art arrives.

## 1. The short version

- **You do not need to finish art before coding starts.** The agent generates flat colored placeholder shapes from the asset list below. You replace them file by file, and the game keeps working.
- **Pixel art is PNG, not SVG.** Vectors do not give exact pixels, and we scale with nearest-neighbor. SVG is fine only for the favicon.
- **Instructions alone are not enough.** The agent needs three things from you: the palette, the exported PNG files (with a small JSON atlas from your art tool), and a provenance note for each file.
- **Order of work:** palette, then Viper, Raider, bullets, and a small explosion. Get those into the game, look at them on a phone, and only then make the rest.

## 2. Two decisions to make before drawing

These change how many frames you draw. The domain spec also depends on them. The defaults below cut the art workload a lot.

### Decision A: Does the Viper rotate?

| Option | What it means | Art cost |
|---|---|---|
| **A1. Fixed heading (proposed)** | The Viper always faces toward the swarm side. It banks left and right while moving. | 3 frames (neutral, bank left, bank right) plus a 2-frame engine flicker |
| A2. Eight directions | The Viper turns to face its movement, drawn at 8 angles. | 8 to 16 frames per ship |
| A3. Runtime rotation | The renderer rotates one sprite. | 1 frame, but rotated pixel art looks uneven ("mixels") and undermines the pixel-perfect look |

**Proposed: A1.** It is the classic look, it makes the touch stick simple (dragging moves the ship, it does not turn it), and auto-fire is predictable. It also affects the domain: with a fixed heading, "forward" for missiles and auto-fire is always toward the swarm.

Raiders follow the same logic. For the MVP, draw them facing the fleet, with a small sweeping-eye animation, and add other angles only when flanking traits ship.

### Decision B: World orientation

**Proposed: one fixed portrait world (9:16), for example 270 x 480 logical pixels.** Phones fill the screen with it. On desktop it is centered, and the side margins show the comms panel, the log, and decoration. That removes rotation of the entire scene, so all sprites keep one orientation. Phone landscape can pillarbox or ask the player to rotate.

This changes what the PRD says ("landscape on desktop"), and is logged as an open question there.

Sprite sizes below assume a 270 x 480 world. If the world size changes, sizes may change with it.

## 3. What to make

**Priority:** P0 needed for M1, P1 by M3, P2 by M4, P3 later.

| Asset id | Size (px) | Frames | Priority | Notes |
|---|---|---|---|---|
| `viper` | 16 x 16 on screen, drawn at 64 x 64 | neutral x2 (engine flicker), bank_left, bank_right | P0 | Angular wedge, not a crescent: tapers from a wide flat back to a sharp nose, hard straight edges. A raised center spine with a small cockpit bump, plus a small fin at each wingtip for detail. Olive and gunmetal hull, white-yellow twin engine glow. A similitude, not a traced show ship. |
| `pilot_eject` | 12 x 16 | 1 (still) | P2 | Ejection seat / chute at the last Viper pose until pickup. Not a flash. Never used for *Anyone Could Be a Cylon* (that death keeps the hull and a red-eye). HUD also says `ejected`. |
| `raider` | 12 x 12 on screen, drawn at 48 x 48 | 3 (eye center, left, right) | P0 | Upside-down crescent, boomerang-shaped: two wingtips sweep forward and out, curving back to a narrower point at the center-rear. The **only** thing in the game that uses hot red. The eye moves 4 pixels in the 48 x 48 picture so the shift survives the shrink. |
| `bullet_player` | 3 x 5 | 1 | P0 | Dradis green |
| `bullet_aimed` | 3 x 5 | 1 | P0 | Red |
| `bullet_stray` | 3 x 7 | 1 | P0 | Orange, longer trail |
| `explosion_small` | 16 x 16 | 6 | P0 | A jagged, arcade-style burst with a few small debris chunks flying free — not a smooth circle or soft glow. Orange, warning yellow, and gunmetal debris only. No white flash frames, and no use of the new engine-glow white-yellow — that color stays on the Viper's own thrust. |
| `flak_burst` | 12 x 12 | 3 | P2 | *Flak Enthusiast* puff at the stray. Warm olive/orange, never white, never Cylon red. Not a flash. A muzzle on Galactica is the second cue. |
| `raider_heavy` | 24 x 24 | 2 | P1 | Bigger arrowhead, visible bays |
| `missile` | 5 x 9 | 2 (flame) | P1 | |
| `missile_pickup` | 8 x 8 | 1 | P1 | |
| `fleet_ship_a/b/c` | 16 x 10 | 1 each | P1 | Civilian ships along the fleet edge, three silly silhouettes |
| `fleet_pip` | 8 x 6 | 2 (ok, damaged) | P1 | HUD version of the fleet ships |
| `galactica_silhouette` | about 200 x 60 | 1 | P1 | Dark, slow parallax in the background. Original design. |
| `resurrection_ship` | 64 x 48 | 3 (damage states) plus a wreck | P1 | Chunky and ominous, clearly *not* a copy of anything. After it dies, the wreck must read as a dead factory, not a parked target. Hangar doors: split when open (red well visible), meet when sealed. HUD also says `bays` / `sealed`. |
| `ghost_blip` | 8 x 8 | 2 | P1 | Dradis-style download marker. Loop-on: filling bar plus the word. Loop-off: leftover blips go grey and stay that way. *Spoilers*: a still plus / cross on the blip so it reads as a target, and it sits at the return column until pickup. Colour is never the only cue; keep a word (`loop` / `offline` or downloading / done). |
| `returned_marker` | 6 x 6 | 3 (x1, x2, x3 scratch) | P1 | Small overlay above Returned Raiders |
| `raptor` | 14 x 12 | 2 | P2 | Escort card. Play uses an olive wedge and hull pips above the fleet line. HUD `raptor n/max` or `hangar`. Never Cylon red. |
| `imaginary_six` | 16 x 16 | 2 | P2 | A steady outline sprite. Costume and silhouette, not likeness. Play uses a pale Dradis outline and a still glow; HUD `six`. Never flickers. Never Cylon red. |
| `explosion_large` | 32 x 32 | 8 | P2 | Same rules as small |
| `icon_hourglass`, `icon_hold_music`, `icon_missile`, `icon_special_ready`, `icon_eye` | 8 x 8 | 1 each | P2 | HUD and status icons |
| `portrait_adama`, `_starbuck`, `_gaeta`, `_dualla` | 64 x 64, shown at 64 CSS px | 4 each (closed, open, blink, signature) | P2 | Core comms cast. Costume and silhouette, not actor likeness. Page images, not playfield sprites. |
| `portrait_tigh`, `_baltar`, `_roslin`, `_tyrol`, `_six` | 64 x 64, shown at 64 CSS px | 4 each | P3 | Cameos. Same four frames. |
| `title_logo` | about 200 x 60 on screen, file drawn at 800 x 240 | 1 | P3 | Wide UI image, not a square sprite. CSS wordmark stands in until `assets/ui/title_logo.png` exists. Prompt in GENERATION-NOTES.md. |

**Drawn in code, not art:** the Dradis sweep, the FTL spool ring, HUD bars, scanlines, the touch stick ring and dot, and parallax stars. That saves you a lot of work, and it keeps them crisp at any size.

**Totals:** about 25 gameplay sprites and 36 portrait frames (9 portraits x 4).

## 4. Palette

Your palette locks the whole look together. Every pixel in every file must use only these colors. Adjust freely, but keep the roles: it is the *roles* that make the game readable.

**Starter palette (23 colors, 2 slots reserved for portrait skin and hair tones that you pick):**

| Role | Colors (hex) |
|---|---|
| Space | `#0b0e14`, `#151b28` |
| Stars | `#5c6b82`, `#d5dde8` |
| Gunmetal (fleet, hulls) | `#2b323c`, `#46505e`, `#77838f`, `#b3bbc5` |
| Olive (Viper, uniforms) | `#39442a`, `#5a6a38`, `#8a9b58` |
| Engine glow (thrust only) | `#fff3d6`, `#ffc457` |
| Dradis green (HUD, player shots) | `#0f3626`, `#1c8459`, `#4fe19a`, `#b8ffdc` |
| **Cylon red (reserved for Cylons only)** | `#55101a`, `#c4161f`, `#ff4747` |
| Stray and warning orange | `#d9731a`, `#ffc457` |
| UI text and borders | `#a39b88`, `#f3efe3` |
| Portrait skin and hair | *reserved: you choose (2 to 4 colors, or a separate portrait sub-palette)* |

Rules:
- **Red means Cylon.** Nothing else uses red.
- **Engine glow is white-yellow (`#fff3d6`, `#ffc457`), not Dradis green.** Dradis green stays reserved for HUD/sensor elements and the player's own shots — keep it off the Viper's hull and engines so the "Dradis" color reads as one consistent signal.
- Red and orange can look alike to some players, so **never rely on color alone**: strays also have a longer trail, and inert Raiders also have an hourglass. Test the game with a color-blindness simulator.
- Aim for at least 4.5:1 contrast for anything the player must read.
- Put the palette in a file the tools can read (a `.gpl` or `.hex` file from your art tool). The agent will add a script that checks every PNG against it.

## 5. File rules

- **Format:** PNG, 8-bit with transparency. Draw the first pack at **4×** the on-screen size (a Raider is 48 × 48, shown at 12 × 12), on a **square canvas**. The game nearest-neighbors it down. Filtering, blur, and a shift smaller than those 4 pixels do not survive.
- **No anti-aliasing and no soft edges.** Every pixel is fully opaque or fully transparent, and uses a palette color.
- **Generated heroes: solid magenta background (`#FF00FF`), always.** It is not in the palette, so it keys out cleanly without risk of eating a real hull or glow color. Check accepted output for a magenta fringe or color bleed at the edges before keying — clean it up by hand if the model left soft pixels there.
- **Keep detail bold, not fine.** A hero is drawn 4× final size so there is room for a cockpit bump, a fin, a color break — but hairline details vanish at the on-screen size. Ask for a small number of chunky, high-contrast details rather than intricate linework, and check the result actually still reads at the final on-screen size before accepting it.
- **Tool:** Aseprite, LibreSprite, Pixelorama, or Piskel (works in the browser). Keep source files (`.aseprite`, `.pxo`, and so on) in `art-src/`. They are not shipped.
- **Sprite sheets:** one PNG per group (for example `ships.png`) plus the JSON data file your tool exports. Aseprite's JSON export (Hash format) is commonly used with Pixi. The renderer spike will confirm it.
- **Frames:** name animation tags in your tool (`neutral`, `bank_left`, `bank_right`, `eye`, `flicker`) and keep the same tag names as the asset list.
- **Anchor:** the sprite center unless noted.
- **Invulnerability and hit feedback:** a steady outline or a slow pulse (2 Hz or slower). **Never strobe.** No white full-screen or full-sprite flashes.
- **Portraits:** 64 × 64, shown at 64 CSS pixels. Same four frames for every character so the animation code is shared. These are page images, so they are not drawn at 4× and shrunk into the 270 × 480 world. A later UI pass may show this same file at about 128 CSS pixels on a large screen (PRD 12.6). Do not draw a second size yet. Signature is not drawn yet: the game shows the closed file for that pose.
- **Fonts:** self-hosted `woff2` files under an open license (for example the SIL Open Font License). Candidates: **Silkscreen** or **Press Start 2P** for style, and **Atkinson Hyperlegible** for the readable-font toggle. Check each license at the time you add it. **Chosen 2026-09-24:** VT323 for the display face and Atkinson Hyperlegible for sentences, both in `assets/fonts/` with their licenses (see `assets/PROVENANCE.md`).

## 6. Provenance

Keep `assets/PROVENANCE.md`, one row per file: file, creator, tool, date, license, notes.

- All art is original. **Do not trace or copy show screenshots or official art.** Draw your own interpretation from silhouette, costume, and the description above.
- If you use any AI image tool, record it in the provenance file, and **never feed it show screenshots or official art as reference.**

## 7. How the agent uses this

1. In M0 or M1, the agent turns the asset table into a manifest (id, file, size, frame tags, anchor, `status: placeholder | final`) and generates flat colored placeholders for everything.
2. You drop real PNGs and atlases into the assets folder and flip `status` to `final`.
3. An asset check script (recommended) validates each PNG: size matches the manifest, only palette colors, no partial transparency. It runs in CI as its own check (`check:assets`) or as part of `check:content`.

## 8. Suggested first session

File names, sizes, and the one-line description of each frame for this session are in [SPRITE-FILES.md](SPRITE-FILES.md). A note on generating those frames is in [GENERATION-NOTES.md](GENERATION-NOTES.md): a hero frame can come from an image model, and the near-copies are a pixel-editor job.

1. Fix the palette in your art tool.
2. Draw `viper`, `raider`, and the three bullets. Export.
3. Draw `explosion_small`.
4. Put them in the game (via a milestone M1 slice), and look at them on a phone at arm's length before drawing anything else.

## 9. Loop-on / loop-off (graphics pass)

The player must always know whether Raiders will come back. Play uses a HUD word (`loop` / `offline`) and a download bar that only appears while the factory is alive. Do not drop the word when the real art arrives; colour is never the only cue (PRD 6).

**Loop on** (cycle 1 until the resurrection ship is destroyed, including before the ship is on the map): a kill grows a ghost with a filling bar and the word downloading.

**Loop off** (ship destroyed): new kills leave no ghost. Leftover blips and Returned markers go grey for good. The wreck should look dead. Slow-mo and a music drop wait with the rest of the kill beat (PRD 5.2).

Do not restyle this while proving other rules. Arrive cycle, expose cycle, HP, and wander are tunables for a later fairness / hardship pass, not this art pass.

## 10. Eject vs download (graphics pass)

Hull to zero is never a run loss (PRD 8.1). There are two ways back onto the board, and they must read as different deaths at a glance.

**Eject** (default): the Viper leaves. You are gone for about 3 seconds, then a pickup at spawn. Play uses a vanished hull, HUD `ejected`, and a placeholder parachute that drifts in one slow arc from where you were. Reduced effects keeps the chute and skips the arc. The real `pilot_eject` sprite replaces that drawing: a pilot-ejection symbol (seat / chute), one frame, no flash, no strobe. The drift can stay in code. It sits until the Viper reappears, then it is gone. Olive/gunmetal, never Cylon red.

**Download** (*Anyone Could Be a Cylon*): you do not leave. The hull stays, a red-eye pixel appears until the next jump, HUD says `two transponders`. No seat, no chute, no empty sky. The joke is that you resurrect like they do.

If both look like "the Viper popped and came back," the card is invisible. Do not reuse `pilot_eject` for the download. Colour is never the only cue (PRD 9, 15).

## 11. Spoilers (graphics pass)

Without the card, a ghost is a download bar on the corpse. With *Spoilers*, the same blip sits on the **return column** (spawn height, death X) and is a target: a still plus / cross through the diamond, Dradis green, never Cylon red. A hit rewinds the bar. Play uses a placeholder plus and a one-beat scale (pause-frozen, skipped when reduced-motion). Real `ghost_blip` frames can carry the plus. Colour is never the only cue (PRD 9, 15).

## 12. Flak (graphics pass)

Without *Flak Enthusiast*, strays that cross the line hit. With it, Galactica eats a seeded fraction: a still puff at the stray (olive + orange, never white) and a short muzzle on the middle hull. Play uses placeholder rectangles and a 140 ms fade (pause-frozen, skipped when reduced-motion). Real `flak_burst` replaces the puff. Colour is never the only cue (PRD 9, 15).

## 13. Hangar bays (graphics pass)

While the resurrection ship is exposed, the hangar doors cycle: **4 s open, 4 s sealed**. Open is a split (red well visible). Sealed is doors meeting (well hidden). HUD says `bays` or `sealed`. Shielded stays `shielded` with doors hidden under the bubble. Play uses sliding placeholder doors. Real ship frames should carry an open and a sealed bay. Colour is never the only cue (PRD 9, 15). Path, panic, and escape FTL still wait.

## 14. Raptor escort (graphics pass)

*Raptor Escort* puts an olive wedge on the fleet line with three hull pips. Hangared escorts vanish; the HUD says `hangar` until the next cycle relaunches them. Play uses a rectangle and a short nose. Real `raptor` frames replace the wedge. Never Cylon red. Colour is never the only cue (PRD 9, 15).

## 15. Imaginary Six (graphics pass)

A pale outline beside the Viper and a thin persistent beam to her current target. The glow is still, never a flicker, well under 3 flashes per second because it does not flash. HUD says `six`. Play uses a stroked rectangle and a low-alpha disc. Real `imaginary_six` frames replace the outline. Costume and silhouette, not likeness. Never Cylon red. Colour is never the only cue (PRD 9, 15). Comms portraits wait.
