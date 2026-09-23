# Picture generation

**Date:** 2026-09-22
**Tool:** Nano Banana (an image model).

The pictures from this attempt are not in the repo. The prompts from this attempt were not saved, so this note cannot say whether the wording caused the result.

## What happened

The first image of a set was usable. The variants that were supposed to be the same picture with one small change came out messy: a bank, an eye shift, a brighter engine, another mouth, the later cells of a burst. The cause is still open. A weak prompt and a model that cannot hold a sprite still are both possible.

## What that job is

The first pack in [SPRITE-FILES.md](SPRITE-FILES.md) is one design, then several near-copies:

- The Viper banks with a slight lean. The flicker frame is the neutral pose with a brighter engine.
- The Raider's eye moves, or narrows to a slit.
- Each portrait's other three frames come from the closed-mouth frame.
- The explosion is one hero frame (the widest, most jagged cell), then five hand-painted frames grown and broken apart from it — not six cells generated together.
- The three bullets are a few pixels and are already marked to draw by hand.

A first picture can invent a ship. The next picture, or the next cell in one sheet, invents another ship. Holding every other pixel still is the part that failed.

## Suggestion

Keep a hero when one looks right: `viper_neutral`, `raider_eye_center`, and each portrait's closed mouth. Paint the other frames from that file in Aseprite, LibreSprite, Pixelorama, or Piskel. Snap the hero to 4× the on-screen size (Raider 48 × 48, Viper 64 × 64) and to the palette in [ART-DIRECTION.md](ART-DIRECTION.md). The game then nearest-neighbors it down to 12 × 12 or 16 × 16. The Raider eye is three frames, and it moves 4 pixels in the 48 × 48 picture so the shift is still there after the shrink.

If the model is tried again, ask for one image per request, and give it the accepted PNG as the only reference. Name the single change (the eye moves left, the mouth opens). Expect to repaint. A strip of variants in one image is the job that already fell apart. Show screenshots and official art stay out of the prompt ([ART-DIRECTION.md](ART-DIRECTION.md) section 6).

Nothing from a generation ships until it is a palette PNG at the size in the sprite list, with a row in `assets/PROVENANCE.md`.

## Revision (2026-09-22): shape correction and a consolidated approach

BSG norms, not the earlier draft: the **Viper is not a crescent** — it should read as an angular wedge/triangle, but with enough detail (a cockpit bump, a raised spine, wingtip fins) that it doesn't come back as a bare grey triangle with lights behind it. The **Raider is the crescent** — an upside-down crescent / boomerang, wingtips swept forward. The earlier prompt draft had this backwards on the Viper and undershot the Raider's curve; the table and prompts below are corrected.

Four other changes from the first attempt, applied to every prompt below:

- **Background is always solid magenta (`#FF00FF`)**, for the Viper and the Raider alike. The first attempt used magenta for the Viper but the Raider's own background for the Raider, which risked keying out real hull pixels since the Raider's dark hull tones sit close to that background color. Magenta isn't in the palette, so a clean key doesn't touch anything else — check accepted output for a magenta fringe at the edges and clean it by hand if the model left soft pixels there.
- **Engine glow is white-yellow (`#fff3d6`, `#ffc457`), not Dradis green.** Dradis green stays reserved for HUD/sensor elements and the player's own shots.
- **Square canvas**, stated explicitly, so the result lines up with the 4× grid before it gets snapped to size.
- **Ask for a couple of bold, chunky details, not fine linework.** The hero is drawn at 4× final size so there's room for detail, but hairline detail disappears once it's shrunk back down — a cockpit bump or a wingtip fin reads at 16×16; a thin panel line does not.

One picture per request, as before. Leave the show's name out of the prompt — the shape is described instead, so the tool isn't asked to reproduce a ship from the show.

**Viper, neutral** (`viper_neutral.png`):

```
Pixel art of an original single-seat space fighter, top-down view, centered in a square image. The hull is a wide angular wedge tapering to a sharp point at the nose — not a crescent, not a smooth curve, all straight edges and hard angles. A raised center spine runs from a small cockpit bump near the front back to the tail. Two short swept wings with a small fin at each wingtip. Colors: olive #5a6a38 and #8a9b58 for the hull, gunmetal #46505e and #77838f for the spine and wing fins, no other colors on the hull. Two round engine pods at the back, each glowing white-yellow with a short flame trail in #fff3d6 and #ffc457. Flat pixel-art shading only, chunky square pixels, hard clean edges, no anti-aliasing, no gradients, no blur. Keep details bold and chunky, not fine hairlines — it needs to still read clearly as a fighter with a cockpit bump and wingtip fins when shrunk to 16 by 16 pixels. Solid flat magenta background #FF00FF, no shadow, no floor, no other objects. One ship only, no text, no logo.
```

**Raider, eye centered** (`raider_eye_center.png`). The sweeping eye is this ship. The Viper does not get one; a red pixel on the Viper is a later card tell, drawn in code.

```
Pixel art of an original fighter craft, seen from directly above, nose pointing straight down, centered in a square image, filling most of the frame. The hull is shaped like an upside-down crescent or boomerang: two wide wingtips sweep forward and out to the sides, curving back to meet at a narrower point in the center-rear — a smooth curved silhouette, not a straight arrowhead. One sweeping eye set into the center of the hull, hot red #c4161f glowing on dark red #55101a. The rest of the hull uses only #2b323c and #55101a. Flat pixel-art colors only, chunky square pixels, hard clean edges, no anti-aliasing, no gradients, no shading. Keep the curve and the eye bold and readable — it needs to still read clearly as a fighter with a visible eye when shrunk to 12 by 12 pixels. Solid flat magenta background #FF00FF, no shadow, no floor, no other objects. One ship, one eye, no text, no logo.
```

**Explosion, peak frame** (`explosion_small_3.png` — the widest, most jagged cell; the other five get hand-painted from it in Aseprite/Piskel, per SPRITE-FILES.md). Referencing the general look of a retro arcade space-battle burst, not any specific game's assets:

```
Pixel art of a mid-sized explosion burst from a retro arcade-style space battle, top-down view, centered in a square image. A jagged, irregular burst — not a smooth circle or a soft blob — with sharp spiky rays of flame reaching outward from a bright core, plus two or three small angular debris chunks flying free at the outer edge. Colors: warm orange #d9731a and warning yellow #ffc457 for the flame core and rays, gunmetal #46505e and #77838f for the debris chunks — no white, no pink, no blue. Flat pixel-art colors only, chunky square pixels, hard clean edges, no anti-aliasing, no glow blur, no soft gradient. Keep the shape bold and readable — it needs to still read clearly as an explosion at its peak when shrunk to 16 by 16 pixels. Solid flat magenta background #FF00FF, no shadow, no floor, no ship. One burst only, no text, no logo.
```

**Title wordmark** (`assets/ui/title_logo.png`). This one is a wide UI image, not a square ship. Draw it at 800 × 240 so it stays sharp when the page shows it at about 200 × 60. The face uses a CSS wordmark until the file exists. Leave the show's name out of the prompt.

```
Pixel-art game title logo, a wide rectangle, exactly the words "33 SECONDS" in chunky block capital letters, centered. Letters use only #4fe19a and #b8ffdc. A small angular starfighter silhouette may sit to the left of the words: olive #5a6a38 and gunmetal #46505e, white-yellow engines #fff3d6 and #ffc457, no red anywhere. Hard square pixels, no anti-aliasing, no gradients, no glow blur, no outline thinner than two pixels. Solid flat magenta background #FF00FF, no shadow, no stars, no extra text. The words must still read as "33 SECONDS" when the image is shown at 200 by 60 pixels.
```
