# Sprite files

Every picture the game needs: its size, where the file goes, and whether it exists. **This is the
one checklist.** A ticked box means the file is in `assets/` today. Why the sizes are what they are
is in [NATIVE-SCALE-REDRAW.md](NATIVE-SCALE-REDRAW.md); the palette and file rules are in
[ART-DIRECTION.md](ART-DIRECTION.md).

**Two kinds of size.**
- **Playfield sprites** (ships, shots, effects) are drawn at **1:1**: the file size is the size in the
  270 × 480 world, and the game scales the whole world up by whole numbers. The pictures in the game
  today were drawn at 4× and shrunk; their native redraws go to `assets/native/` so nothing breaks
  until ADR-0002 Phase 4 switches over. Whether desktop fighters stay 1.25× larger is also decided in
  Phase 4; the Viper and Raider sizes below assume they do not.
- **Page pictures** (portraits, card art, icons, the title) are shown in the HUD and menus at a
  whole-number CSS scale, noted per item.

Items are the ships, shots, and effects. Characters are the comms portraits: costume and silhouette,
never a real person's face. Hot red belongs to Cylons only: the Raider, the heavy Raider, the
resurrection ship, and `bullet_aimed`.

## Checklist

### In the game now (drawn at 4×, shrunk in the game)

- [x] `assets/ships/viper_neutral.png`, `viper_bank_left.png`, `viper_bank_right.png`, `viper_flicker.png` — 64 × 64, shown 16 × 16
- [x] `assets/ships/raider_eye_center.png`, `raider_eye_left.png`, `raider_eye_right.png` — 48 × 48, shown 12 × 12
- [x] `assets/projectiles/bullet_player.png`, `bullet_aimed.png` — 12 × 20, shown 3 × 5
- [x] `assets/projectiles/bullet_stray.png` — 12 × 28, shown 3 × 7
- [x] `assets/effects/explosion_small_1.png` … `_6.png` — 64 × 64, shown 16 × 16

These stay in use until their native redraws below replace them.

### Portraits (page pictures, 64 × 64, shown at 64 CSS px; 128 = 2× in the desktop COMMS console)

- [x] Closed, open, and blink for all nine: Adama, Starbuck, Gaeta, Dualla, Tigh, Baltar, Roslin, Tyrol, Six (`assets/portraits/<name>_closed.png`, `_open.png`, `_blink.png`)
- [ ] Signature pose for all nine: `assets/portraits/<name>_signature.png`, 64 × 64 (descriptions under Characters). Until then the game shows the closed file.

### Native redraw, group 1: replaces what is on screen (draw first) → `assets/native/`

- [ ] `assets/native/ships/viper_neutral.png`, `viper_bank_left.png`, `viper_bank_right.png`, `viper_flicker.png` — **24 × 24**
- [ ] `assets/native/ships/raider_eye_center.png`, `raider_eye_left.png`, `raider_eye_right.png` — **16 × 16** (the eye moves 1 pixel)
- [ ] `assets/native/projectiles/bullet_player.png`, `bullet_aimed.png` — **3 × 5**
- [ ] `assets/native/projectiles/bullet_stray.png` — **3 × 7**
- [ ] `assets/native/projectiles/bullet_player_big.png` — **5 × 8** (new: the *Overcompensating Cannon* round)
- [ ] `assets/native/effects/explosion_small_1.png` … `_6.png` — **16 × 16**

### Native redraw, group 2: new ships (placeholder shapes today) → `assets/native/ships/`

- [ ] `raider_heavy_eye_center.png`, `_left.png`, `_right.png` — **24 × 24**, heavier arrowhead with visible bays
- [ ] `resurrection_ship_sealed.png`, `resurrection_ship_open.png`, `resurrection_ship_wreck.png` — **48 × 32** (the shield bubble is drawn in code)
- [ ] `civilian_a.png`, `civilian_b.png`, `civilian_c.png` — **16 × 8**, three silly silhouettes
- [ ] `civilian_a_damaged.png`, `civilian_b_damaged.png`, `civilian_c_damaged.png` — **16 × 8**, visibly dented
- [ ] `galactica_fleet.png`, `galactica_fleet_damaged.png` — **24 × 10**
- [ ] `raptor.png` — **16 × 8**, olive, never red
- [ ] `imaginary_six.png` — **12 × 16**, outline figure (glow in code)
- [ ] `pilot_eject.png` — **12 × 16**, seat and chute; never used for a download

### Native redraw, group 3: effects, markers, background → `assets/native/`

- [ ] `projectiles/missile_1.png`, `missile_2.png` — **4 × 8**, flame flicker at 2 Hz or slower
- [ ] `effects/flak_burst_1.png` … `_3.png` — **8 × 8**, warm olive and orange
- [ ] `effects/explosion_large_1.png` … `_8.png` — **32 × 32**, heavy Raider and the factory
- [ ] `effects/spark_1.png`, `spark_2.png` — **4 × 4**, hit feedback
- [ ] `markers/ghost_blip.png` — **8 × 8** (the fill bar is drawn in code)
- [ ] `markers/returned_x1.png`, `_x2.png`, `_x3.png` — **6 × 6**, tally scratches
- [ ] `background/galactica_silhouette.png` — **160 × 48**, dark, two or three space colours

### Card art (page pictures, for the upgrade pick in ADR-0002 Phase 2) → `assets/cards/`

A wide banner across the top of each card. **112 × 36**, shown at 3× (336 × 108) on desktop and
laptop and at 2× (224 × 72) on a phone. One file per card, named by its card id. Same palette and
file rules as sprites; a small scene or emblem that says the joke at a glance, never text.

- [ ] `assets/cards/accidentally-wide.png`
- [ ] `assets/cards/anyone-could-be-a-cylon.png`
- [ ] `assets/cards/bootleg-hooch.png`
- [ ] `assets/cards/continuity-of-government.png`
- [ ] `assets/cards/flak-enthusiast.png`
- [ ] `assets/cards/hangar-door-slam.png`
- [ ] `assets/cards/imaginary-six.png`
- [ ] `assets/cards/overcompensating-cannon.png`
- [ ] `assets/cards/personal-vendetta.png`
- [ ] `assets/cards/raptor-escort.png`
- [ ] `assets/cards/spoilers.png`
- [ ] `assets/cards/your-call-is-important-to-us.png`

A card without its file shows a plain labelled slot, so these can land one at a time.

### HUD icons (page pictures) → `assets/icons/`

**8 × 8**, shown at 2× or 3×. One colour plus transparency, so the HUD can tint them.

- [ ] `missile.png`, `special.png`, `hourglass.png`, `hold_music.png`, `eye.png`, `fleet.png`, `ftl.png`

### Title (page picture) → `assets/ui/`

- [ ] `assets/ui/title_logo.png` — **160 × 48**, shown at 3× (480 × 144) on desktop and 2× (320 × 96) on a phone. Until it exists the title uses VT323 text. Description under Title below.

## Current pictures (drawn at 4×)

Descriptions of the files in the game today. Their native redraws above keep the same designs.


| Folder | File | Drawn at | Shown as | What it shows |
|---|---|---|---|---|
| `assets/ships/` | `viper_neutral.png` | 64 × 64 | 16 × 16 | An original starfighter facing straight up. An angular wedge, not a crescent — tapers hard from a flat back to a sharp nose, with a raised center spine, a small cockpit bump, and a small fin at each wingtip. Olive and gunmetal hull, white-yellow twin engine glow. A similitude, not a traced show ship. |
| `assets/ships/` | `viper_bank_left.png` | 64 × 64 | 16 × 16 | The same starfighter, banked slightly to its left, engines unchanged. |
| `assets/ships/` | `viper_bank_right.png` | 64 × 64 | 16 × 16 | The same starfighter, banked slightly to its right, engines unchanged. |
| `assets/ships/` | `viper_flicker.png` | 64 × 64 | 16 × 16 | The same starfighter in the neutral pose, engines one step brighter. |
| `assets/ships/` | `raider_eye_center.png` | 48 × 48 | 12 × 12 | A small fighter facing straight down, hull shaped like an upside-down crescent or boomerang — wingtips sweeping forward and out, curving back to a point at the center-rear. One sweeping eye, hot red and dark red only on this craft. |
| `assets/ships/` | `raider_eye_left.png` | 48 × 48 | 12 × 12 | The same fighter, eye shifted left by 4 pixels. |
| `assets/ships/` | `raider_eye_right.png` | 48 × 48 | 12 × 12 | The same fighter, eye shifted right by 4 pixels. |
| `assets/projectiles/` | `bullet_player.png` | 12 × 20 | 3 × 5 | A short Dradis-green shot. A few pixels; draw it by hand. |
| `assets/projectiles/` | `bullet_aimed.png` | 12 × 20 | 3 × 5 | A short red shot. A few pixels; draw it by hand. |
| `assets/projectiles/` | `bullet_stray.png` | 12 × 28 | 3 × 7 | A longer orange shot. A few pixels; draw it by hand. |
| `assets/effects/` | `explosion_small_1.png` | 64 × 64 | 16 × 16 | A small bright core with just one or two short spikes of flame — the burst just starting, no debris yet. |
| `assets/effects/` | `explosion_small_2.png` | 64 × 64 | 16 × 16 | The burst growing: more jagged flame spikes, core still bright, a piece or two of debris just starting to separate. |
| `assets/effects/` | `explosion_small_3.png` | 64 × 64 | 16 × 16 | The burst at its widest and jagged: this is the hero frame (see below). Spiky orange/yellow flame rays with a couple of small gunmetal debris chunks flying free at the edges. |
| `assets/effects/` | `explosion_small_4.png` | 64 × 64 | 16 × 16 | The burst starting to break apart: the rays separate into distinct embers, debris chunks drift further out. |
| `assets/effects/` | `explosion_small_5.png` | 64 × 64 | 16 × 16 | A few scattered warm embers and one or two drifting debris chunks, core mostly gone. |
| `assets/effects/` | `explosion_small_6.png` | 64 × 64 | 16 × 16 | The last one or two faint embers before it is gone. |

The Raider's eye is three frames: center, left, right. The shift is 4 pixels in the 48 × 48 picture, which is 1 pixel after the shrink. A smaller shift disappears. A slit frame is optional and is not part of the sweep.

Generate only `explosion_small_3` (the widest, most jagged frame — see the hero prompt in [GENERATION-NOTES.md](GENERATION-NOTES.md)), then hand-paint the other five in Aseprite/Piskel by growing into it (frames 1–2) and breaking it apart (frames 4–6). Generating all six as one strip is exactly the kind of multi-frame request that came out inconsistent last time — see GENERATION-NOTES.md.

## Characters

Every portrait is a bust facing forward, drawn at 64 × 64 and shown at 64 CSS pixels, in `assets/portraits/`. These are page images, not playfield sprites, so they are not drawn at 4× and shrunk into the 270 × 480 world. A later UI pass may show this same file at about 128 CSS pixels on a large screen (PRD 12.6). Do not draw a second size yet. Closed, open, and blink are in the game. Signature is not drawn yet: the game shows the closed file for that pose. Two flat skin tones and one flat hair color are allowed. Still no red, except none at all on Six: she is a pale Dradis-green outline with no fill. Make the closed-mouth frame first, and derive the other three from it.

### Adama

| File | What it shows |
|---|---|
| `adama_closed.png` | An older fleet commander, short grey hair, dark duty uniform, mouth closed, stern. |
| `adama_open.png` | The same portrait, mouth slightly open. |
| `adama_blink.png` | The same portrait, eyes shut in a blink. |
| `adama_signature.png` | The same portrait, eyes half-closed, a quiet order. |

### Starbuck

| File | What it shows |
|---|---|
| `starbuck_closed.png` | A pilot, short hair, flight suit, mouth closed, cocky. |
| `starbuck_open.png` | The same portrait, mouth open mid-word. |
| `starbuck_blink.png` | The same portrait, eyes shut in a blink. |
| `starbuck_signature.png` | The same portrait, a one-sided smirk. |

### Gaeta

| File | What it shows |
|---|---|
| `gaeta_closed.png` | A young officer, neat dark hair, glasses, duty uniform, mouth closed, focused. |
| `gaeta_open.png` | The same portrait, mouth slightly open. |
| `gaeta_blink.png` | The same portrait, eyes shut in a blink. |
| `gaeta_signature.png` | The same portrait, eyes turned toward a side display. |

### Dualla

| File | What it shows |
|---|---|
| `dualla_closed.png` | A communications officer, headset, duty uniform, mouth closed, calm. |
| `dualla_open.png` | The same portrait, mouth slightly open. |
| `dualla_blink.png` | The same portrait, eyes shut in a blink. |
| `dualla_signature.png` | The same portrait, a small tired smile. |

### Tigh

| File | What it shows |
|---|---|
| `tigh_closed.png` | An older officer, grey hair, eyepatch, duty uniform, mouth closed, gruff. |
| `tigh_open.png` | The same portrait, mouth slightly open. |
| `tigh_blink.png` | The same portrait, the visible eye shut in a blink. |
| `tigh_signature.png` | The same portrait, a scowl. |

### Baltar

| File | What it shows |
|---|---|
| `baltar_closed.png` | A civilian scientist, rumpled jacket, no uniform, mouth closed, uneasy. |
| `baltar_open.png` | The same portrait, mouth open, mid-excuse. |
| `baltar_blink.png` | The same portrait, eyes shut in a blink. |
| `baltar_signature.png` | The same portrait, eyes wide, a nervous smile. |

### Roslin

| File | What it shows |
|---|---|
| `roslin_closed.png` | A civilian president, short hair, plain suit, no uniform, mouth closed, composed. |
| `roslin_open.png` | The same portrait, mouth slightly open. |
| `roslin_blink.png` | The same portrait, eyes shut in a blink. |
| `roslin_signature.png` | The same portrait, a measured knowing look. |

### Tyrol

| File | What it shows |
|---|---|
| `tyrol_closed.png` | A deck chief, coveralls, short hair, mouth closed, tired. |
| `tyrol_open.png` | The same portrait, mouth slightly open. |
| `tyrol_blink.png` | The same portrait, eyes shut in a blink. |
| `tyrol_signature.png` | The same portrait, a skeptical squint. |

### Six

| File | What it shows |
|---|---|
| `six_closed.png` | A woman drawn as a pale Dradis-green outline only, no fill, no red, mouth closed, cool. |
| `six_open.png` | The same outline, mouth slightly open. |
| `six_blink.png` | The same outline, eyes shut in a blink. |
| `six_signature.png` | The same outline, a slight amused smile. |

## Title

Not a playfield sprite. The face uses VT323 text and the existing Viper picture until this file exists. Drawn at 1:1 and shown with nearest-neighbor (`image-rendering: pixelated`) at a whole-number scale. A generated 800 × 240 hero from the prompt in GENERATION-NOTES.md is fine as a reference; repaint it at 160 × 48 by hand.

| Folder | File | Drawn at | Shown as | What it shows |
|---|---|---|---|---|
| `assets/ui/` | `title_logo.png` | 160 × 48 | 3× on desktop, 2× on a phone | The words "33 SECONDS" in chunky block letters, Dradis green. A small angular starfighter may sit to the left of the words. Wide rectangle, magenta background. Prompt in [GENERATION-NOTES.md](GENERATION-NOTES.md). |
