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
- The explosion is six cells of one burst.
- The three bullets are a few pixels and are already marked to draw by hand.

A first picture can invent a ship. The next picture, or the next cell in one sheet, invents another ship. Holding every other pixel still is the part that failed.

## Suggestion

Keep a hero when one looks right: `viper_neutral`, `raider_eye_center`, and each portrait's closed mouth. Paint the other frames from that file in Aseprite, LibreSprite, Pixelorama, or Piskel. Snap the hero to 4× the on-screen size (Raider 48 × 48, Viper 64 × 64) and to the palette in [ART-DIRECTION.md](ART-DIRECTION.md). The game then nearest-neighbors it down to 12 × 12 or 16 × 16. The Raider eye is three frames, and it moves 4 pixels in the 48 × 48 picture so the shift is still there after the shrink.

If the model is tried again, ask for one image per request, and give it the accepted PNG as the only reference. Name the single change (the eye moves left, the mouth opens). Expect to repaint. A strip of variants in one image is the job that already fell apart. Show screenshots and official art stay out of the prompt ([ART-DIRECTION.md](ART-DIRECTION.md) section 6).

Nothing from a generation ships until it is a palette PNG at the size in the sprite list, with a row in `assets/PROVENANCE.md`.

## Prompts for the next try

One picture per request. Leave the show's name out of the prompt. The shape is described instead, so the tool is not asked to reproduce a ship from the show.

**Viper, neutral** (`viper_neutral.png`):

```
One original pixel-art starfighter, seen from directly above, nose pointing straight up, centered and filling most of the frame. Shallow crescent silhouette: the wingtips hook slightly forward, a short body sits between them, and two engine nozzles sit on the trailing edge with a short olive flame. Flat colors only: olive #39442a #5a6a38 #8a9b58 and gunmetal #2b323c #46505e #77838f. A dark canopy slit, not an eye, and no red. Chunky square pixels, hard edges, no anti-aliasing, no gradients, no glow bloom. It should still read if reduced to 16 by 16 pixels. Solid flat background #0b0e14. One ship. No text, no logo, no shadow, no floor, no turnaround, no extra views.
```

**Raider, eye centered** (`raider_eye_center.png`). The sweeping eye is this ship. The Viper does not get one; a red pixel on the Viper is a later card tell, drawn in code.

```
One original pixel-art fighter, seen from directly above, nose pointing straight down, centered and filling most of the frame. Small arrowhead silhouette. One sweeping eye in the middle of the craft, hot red #c4161f on dark red #55101a. Hull is #2b323c and #55101a only. Flat colors, chunky square pixels, hard edges, no anti-aliasing, no gradients. It should still read if reduced to 12 by 12 pixels. Solid flat background #0b0e14. One ship, one eye. No text, no logo, no shadow, no floor, no turnaround, no extra views.
```
