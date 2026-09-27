# Sprite files

Every picture the game needs: what it is, the exact file size to draw, where the file goes, and
whether it exists. **This is the one checklist.** A ticked box means the file is in `assets/` and
already right. The reasoning behind the sizes is in [ART-SCALE.md](ART-SCALE.md); the palette and
file rules are in [ART-DIRECTION.md](ART-DIRECTION.md).

**How sizes work.** Playfield pictures (ships, shots, effects) are drawn at **two art pixels per
world unit**: draw the file at exactly the size listed, and the game shows it at half that many world
units, one size on every screen. Page pictures (portraits, card art, HUD icons, the title) are shown
in the HUD and menus at the CSS scale listed.

For reference, the lane is 270 world units wide on a phone and 324 on a desktop. The Viper, at 32
units, is about 53 CSS pixels tall on a 1440 × 900 desktop and 46 on a phone.

Hot red belongs to Cylons only: the Raider, the heavy Raider, the resurrection ship, and
`bullet_aimed`. Characters are costume and silhouette, never a real person's face.

## Checklist

### Your fighters (already done)

- [x] **Viper** — `assets/ships/viper_neutral.png`, `viper_bank_left.png`, `viper_bank_right.png`,
  `viper_flicker.png` — **64 × 64** (32 world units). Also the title's picture, at 2×.
- [x] **Raider** — `assets/ships/raider_eye_center.png`, `raider_eye_left.png`,
  `raider_eye_right.png` — **48 × 48** (24 units).
- [x] **Heavy Raider** — `assets/ships/raider_heavy.png`, `raider_heavy_damaged.png` — **72 × 72**
  (36 units). One still picture each, no eye sweep (only the Raider's eye sweeps). The damaged one
  shows from half its hull, so damage is not only a colour.
- [x] **Resurrection ship** — `assets/ships/resurrection_ship_sealed.png`,
  `resurrection_ship_open.png`, `resurrection_ship_wreck.png` — **96 × 64** (48 × 32 units). Sealed
  while shielded and when the bays are shut, open while they are open, wreck once it is destroyed. The
  shield bubble and the hull bar are drawn in code. Its hitbox follows the long hull (PRD 8.4), so a
  redraw with a different outline may need the hitbox retuned.
- [x] **Small explosion** — `assets/effects/explosion_small_1.png` … `_6.png` — **64 × 64** (32 units).

### Shots (done)

Redrawn at the new density and in the game.

- [x] **Player shot** — `assets/projectiles/bullet_player.png` — **6 × 10**. Dradis green.
- [x] **Aimed Cylon shot** — `assets/projectiles/bullet_aimed.png` — **6 × 10**. Red.
- [x] **Stray shot** — `assets/projectiles/bullet_stray.png` — **6 × 14**. Orange, longer trail.
- [x] **Big shot** (*Overcompensating Cannon*) — `assets/projectiles/bullet_player_big.png` — **10 × 16**.
  Replaces the player shot once the card is taken: 5 × 8 units at one stack, larger with each stack after.
- [x] **Missile** — `assets/projectiles/missile_1.png`, `missile_2.png` — **8 × 16**, two frames of
  flame, flickering at 2 Hz. Reduced effects holds the first frame.

### New ships (placeholder shapes in the game today, unless ticked)

- [x] **Civilian ships** — `assets/ships/civilian_1.png`, `civilian_2.png`, `civilian_3.png` —
  **32 × 16** (16 × 8 units). Silly silhouettes; the line cycles through them in order. More can be
  added as `civilian_4.png` and so on, each with its dented pair, plus one entry in
  `CIVILIAN_VARIANTS` (`src/infrastructure/phaser/sprites.ts`).
- [x] **Civilian ships, dented** — `assets/ships/civilian_1_damaged.png`, `_2_damaged.png`,
  `_3_damaged.png` — **32 × 16**. The same ships, visibly dented, so damage is not only a colour.
- [x] **Galactica on the fleet line** — `assets/ships/galactica_fleet.png`,
  `galactica_fleet_damaged.png` — **64 wide × 76 tall** (32 × 38 units), portrait. Only the front
  of Galactica, nose pointing up, rising out of the bottom edge of the screen; the rest of the ship
  is "off screen", so it looks huge while taking one wider slot in the line. From the bottom of the
  file up:
  - **4 px bleed**, hidden below the screen edge.
  - **32 px of hull** from the screen edge up to the fleet line. The line crosses the file 36 px up
    from the bottom; keep the hull about 64 px wide there, so strays that land on it hit Galactica.
  - **40 px of nose** above the line, tip at the top row. Taper it however you like.

  The dented one keeps the same outline, so it does not jump when it swaps.
- [x] **Raptor** — `assets/ships/raptor.png` — **32 × 16** (16 × 8 units). Olive, never red.
- [x] **Imaginary Six** — `assets/ships/imaginary_six.png` — **32 × 48** (16 × 24 units). A steady
  figure flying beside the Viper, with its still glow drawn in the picture. Costume and silhouette.
- [x] **Ejected pilot** — `assets/ships/pilot_eject.png` — **32 × 40** (16 × 20 units). Seat and
  chute. Never used for a download.

### Effects and markers

- [x] **Large explosion** — `assets/effects/explosion_large_1.png` … `_7.png` — **96 × 96**
  (48 units). Heavy Raider and the resurrection ship. Same rules as the small one: no white frames.
  Seven frames were drawn and the game plays seven; an eighth is optional.
- [ ] **Flak burst** — `assets/effects/flak_burst_1.png` … `_3.png` — **16 × 16**. Warm olive and
  orange, never white or red.
- [ ] **Download blip** — `assets/markers/ghost_blip.png` — **16 × 16**. The fill bar is drawn in code.

### Background

- [ ] **Galactica silhouette** — `assets/background/galactica_silhouette.png` — **320 × 96**. Dark,
  slow parallax behind the fight. Two or three space colours only.

### Card art (page pictures) → `assets/cards/`

A wide banner across the top of each upgrade card. **672 × 216**, a detailed illustration shown at
336 × 108 CSS pixels on desktop and laptop and 224 × 72 on a phone, smoothly scaled (ART-SCALE). One
file per card, named by its id. A small scene or emblem that says the joke at a
glance, never text. A card without its file shows an empty slot, so these can land one at a time.

- [x] `accidentally-wide.png`
- [x] `anyone-could-be-a-cylon.png`
- [x] `bootleg-hooch.png`
- [x] `continuity-of-government.png`
- [x] `flak-enthusiast.png`
- [x] `hangar-door-slam.png`
- [x] `imaginary-six.png`
- [x] `overcompensating-cannon.png`
- [x] `personal-vendetta.png`
- [x] `raptor-escort.png`
- [x] `spoilers.png`
- [x] `your-call-is-important-to-us.png`

### Portraits (page pictures) → `assets/portraits/`

**64 × 64**, shown at 64 CSS pixels, and at 128 (exactly 2×) in the desktop COMMS console.

- [x] Closed, open, and blink for all nine: Adama, Starbuck, Gaeta, Dualla, Tigh, Baltar, Roslin,
  Tyrol, Six (`<name>_closed.png`, `_open.png`, `_blink.png`).
- [ ] Signature pose for all nine: `<name>_signature.png`. Descriptions under Characters. Until they
  exist, the game shows the closed file.

### HUD icons (page pictures) → `assets/icons/`

**8 × 8**, shown at 2× or 3×. One colour plus transparency, so the HUD can tint them.

- [ ] `missile.png`, `special.png`, `hourglass.png`, `hold_music.png`, `eye.png`, `fleet.png`, `ftl.png`

### Title (page picture) → `assets/ui/`

- [ ] `title_logo.png` — **160 × 48**, shown at 3× on desktop and 2× on a phone. Until it exists the
  title uses VT323 text beside the Viper. Description under Title below.

### Drawn in code (nothing to draw)

Sparks, the Returned Raider's glow and its `x2` count, the shield bubble and its ripple, the FTL ring, download bars, hull pips, the strafe line,
the stick indicator, and the starfield.

## Suggested order

1. ~~The four shots and the missile~~ (done).
2. ~~The heavy Raider and the resurrection ship~~ (done).
3. **The fleet**: civilians, dented civilians, Galactica, the Raptor.
4. **Card art**, one at a time, whenever you like.
5. Everything else.

## Descriptions of the pictures in the game

What each existing playfield picture shows. The "Shown as" column is world units at the current scale.


| Folder | File | Drawn at | Shown as | What it shows |
|---|---|---|---|---|
| `assets/ships/` | `viper_neutral.png` | 64 × 64 | 32 × 32 | An original starfighter facing straight up. An angular wedge, not a crescent — tapers hard from a flat back to a sharp nose, with a raised center spine, a small cockpit bump, and a small fin at each wingtip. Olive and gunmetal hull, white-yellow twin engine glow. A similitude, not a traced show ship. |
| `assets/ships/` | `viper_bank_left.png` | 64 × 64 | 32 × 32 | The same starfighter, banked slightly to its left, engines unchanged. |
| `assets/ships/` | `viper_bank_right.png` | 64 × 64 | 32 × 32 | The same starfighter, banked slightly to its right, engines unchanged. |
| `assets/ships/` | `viper_flicker.png` | 64 × 64 | 32 × 32 | The same starfighter in the neutral pose, engines one step brighter. |
| `assets/ships/` | `raider_eye_center.png` | 48 × 48 | 24 × 24 | A small fighter facing straight down, hull shaped like an upside-down crescent or boomerang — wingtips sweeping forward and out, curving back to a point at the center-rear. One sweeping eye, hot red and dark red only on this craft. |
| `assets/ships/` | `raider_eye_left.png` | 48 × 48 | 24 × 24 | The same fighter, eye shifted left by 4 pixels. |
| `assets/ships/` | `raider_eye_right.png` | 48 × 48 | 24 × 24 | The same fighter, eye shifted right by 4 pixels. |
| `assets/ships/` | `raider_heavy.png` | 72 × 72 | 36 × 36 | A bulky gunmetal ship facing straight down, with visible bays and a steady red eye. One still picture, no eye sweep. |
| `assets/ships/` | `resurrection_ship_sealed.png` | 96 × 64 | 48 × 32 | A long, thin, spiny gunmetal hull lying across the frame, with shut doors at its middle. The top and bottom of the frame are empty. |
| `assets/ships/` | `resurrection_ship_open.png` | 96 × 64 | 48 × 32 | The same hull, the middle doors gone and a glowing red well in their place. |
| `assets/ships/` | `resurrection_ship_wreck.png` | 96 × 64 | 48 × 32 | The hull broken in two at the middle, darker, with plating and debris flung above and below. No glow. |
| `assets/ships/` | `raider_heavy_damaged.png` | 72 × 72 | 36 × 36 | The same ship, scorched and torn open: shown at half its hull or less. |
| `assets/projectiles/` | `bullet_player.png` | 6 × 10 | 3 × 5 | A short Dradis-green shot. |
| `assets/projectiles/` | `bullet_aimed.png` | 6 × 10 | 3 × 5 | A short red shot. |
| `assets/projectiles/` | `bullet_stray.png` | 6 × 14 | 3 × 7 | A longer orange shot. |
| `assets/projectiles/` | `bullet_player_big.png` | 10 × 16 | 5 × 8, larger with more stacks | A fat green teardrop shot for *Overcompensating Cannon*. |
| `assets/projectiles/` | `missile_1.png`, `missile_2.png` | 8 × 16 | 4 × 8 | A missile nose-up with a flame at the tail; the two frames swap the flame. |
| `assets/effects/` | `explosion_small_1.png` | 64 × 64 | 32 × 32 | A small bright core with just one or two short spikes of flame — the burst just starting, no debris yet. |
| `assets/effects/` | `explosion_small_2.png` | 64 × 64 | 32 × 32 | The burst growing: more jagged flame spikes, core still bright, a piece or two of debris just starting to separate. |
| `assets/effects/` | `explosion_small_3.png` | 64 × 64 | 32 × 32 | The burst at its widest and jagged: this is the hero frame (see below). Spiky orange/yellow flame rays with a couple of small gunmetal debris chunks flying free at the edges. |
| `assets/effects/` | `explosion_small_4.png` | 64 × 64 | 32 × 32 | The burst starting to break apart: the rays separate into distinct embers, debris chunks drift further out. |
| `assets/effects/` | `explosion_small_5.png` | 64 × 64 | 32 × 32 | A few scattered warm embers and one or two drifting debris chunks, core mostly gone. |
| `assets/effects/` | `explosion_small_6.png` | 64 × 64 | 32 × 32 | The last one or two faint embers before it is gone. |

| `assets/effects/` | `explosion_large_1.png` … `_7.png` | 96 × 96 | 48 × 48 | The large burst: a small core, a spiky orange star at its widest (frame 3, held when effects are reduced), then a dark centre with a fading red-orange rim and grey debris. |

The Raider's eye is three frames: center, left, right, shifted 4 pixels in the 48 × 48 picture. Only the Raider's eye sweeps; the heavy Raider is a still picture. A slit frame is optional and is not part of the sweep.

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
