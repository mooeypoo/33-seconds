# Sprite files

The first picture pass. One PNG per frame, at the size below. A generated hero can be scaled down with nearest-neighbor and snapped to the palette in [ART-DIRECTION.md](ART-DIRECTION.md). Matching variants are painted from that hero; a first try at generating the variants is in [GENERATION-NOTES.md](GENERATION-NOTES.md). Drop each file at the path in the table. The rest of the asset table (fleet, resurrection ship, icons, title logo) waits.

Items are the ships, shots, and the explosion. Characters are the comms portraits: costume and silhouette, never a real person's face. Hot red belongs to the Raider and to `bullet_aimed` only.

## Items

| Folder | File | Size | What it shows |
|---|---|---|---|
| `assets/ships/` | `viper_neutral.png` | 16 × 16 | A small wedge starfighter facing straight up, twin engines with a short olive glow, olive and gunmetal. |
| `assets/ships/` | `viper_bank_left.png` | 16 × 16 | The same starfighter, banked slightly to its left, engines unchanged. |
| `assets/ships/` | `viper_bank_right.png` | 16 × 16 | The same starfighter, banked slightly to its right, engines unchanged. |
| `assets/ships/` | `viper_flicker.png` | 16 × 16 | The same starfighter in the neutral pose, engines one pixel brighter. |
| `assets/ships/` | `raider_eye_center.png` | 12 × 12 | A small arrowhead fighter facing straight down, one sweeping eye, hot red and dark red only on this craft. |
| `assets/ships/` | `raider_eye_left.png` | 12 × 12 | The same fighter, eye shifted left. |
| `assets/ships/` | `raider_eye_right.png` | 12 × 12 | The same fighter, eye shifted right. |
| `assets/ships/` | `raider_eye_narrow.png` | 12 × 12 | The same fighter, eye narrowed to a slit. |
| `assets/projectiles/` | `bullet_player.png` | 3 × 5 | A short Dradis-green shot. A few pixels; draw it by hand. |
| `assets/projectiles/` | `bullet_aimed.png` | 3 × 5 | A short red shot. A few pixels; draw it by hand. |
| `assets/projectiles/` | `bullet_stray.png` | 3 × 7 | A longer orange shot. A few pixels; draw it by hand. |
| `assets/effects/` | `explosion_small_1.png` | 16 × 16 | The first cell of the burst: a small warm spark, olive, orange, and gunmetal. No white. |
| `assets/effects/` | `explosion_small_2.png` | 16 × 16 | The burst a little wider. |
| `assets/effects/` | `explosion_small_3.png` | 16 × 16 | The burst at its widest. |
| `assets/effects/` | `explosion_small_4.png` | 16 × 16 | The burst starting to break apart. |
| `assets/effects/` | `explosion_small_5.png` | 16 × 16 | A few warm embers left. |
| `assets/effects/` | `explosion_small_6.png` | 16 × 16 | The last faint embers before it is gone. |

Generate the explosion as one horizontal strip of 6 equal cells, then slice it into these six files.

## Characters

Every portrait is a bust facing forward, 32 × 32, in `assets/portraits/`. Two flat skin tones and one flat hair color are allowed. Still no red, except none at all on Six: she is a pale Dradis-green outline with no fill. Make the closed-mouth frame first, and derive the other three from it.

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
