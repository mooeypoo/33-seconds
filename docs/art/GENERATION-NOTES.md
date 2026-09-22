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

Keep a hero when one looks right: `viper_neutral`, `raider_eye_center`, and each portrait's closed mouth. Paint the other frames from that file in Aseprite, LibreSprite, Pixelorama, or Piskel. Then scale with nearest-neighbor and snap to the palette in [ART-DIRECTION.md](ART-DIRECTION.md).

If the model is tried again, ask for one image per request, and give it the accepted PNG as the only reference. Name the single change (the eye moves left, the mouth opens). Expect to repaint. A strip of variants in one image is the job that already fell apart. Show screenshots and official art stay out of the prompt ([ART-DIRECTION.md](ART-DIRECTION.md) section 6).

Nothing from a generation ships until it is a palette PNG at the size in the sprite list, with a row in `assets/PROVENANCE.md`.
