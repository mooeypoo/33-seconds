# 0048 — A hand of cards

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 2, PR 2b (the pick as cards)
**Ends with:** Phase 2 done. The pick between jumps looks like a reward, not a settings list.

---

## What we set out to do

Turn the three rows of the Recovering pick into the cards from the approved mock-up: rarity you can
read, the stack you would get, a banner for the owner's art, the joke up front, and the effect and
the two advisors beside it.

## What we decided

**Two shapes of the same card.** A wide window has room for everything, so all three cards show
their effect and advisors at once. A phone stacks them and opens one at a time, which keeps the old
rule that the joke is read first. The rule moved from "a closed row" to "on a phone, until opened."

**Rarity is a word and a frame.** Common is a thin line, Uncommon a heavier brass frame,
Questionable a doubled amber one, and the card says its rarity. Colour alone never carries it.

**Art arrives by file name.** The sheet looks for `assets/cards/<card-id>.png`. Until one exists,
the banner slot is empty at its final size, so dropping art in changes nothing else.

**The owner ruled on ship names.** A name that only lands after later episodes is a nod, not a
spoiler. The content schema records the line: it must not tell a new viewer what happens.

## What we measured

- Unit tests: 214 (one new for the facts beside each card: rarity, owned, cap).
- The pick's end-to-end test now runs both shapes: three advisors each visible at once on a desktop,
  none until opened on a phone.

## What surprised us

**Apply fell off the phone.** Three cards are taller than a phone's lane, so the most important
button was below the fold. It is now pinned to the bottom of the sheet, over a solid background so
the next card does not read through it.

**The scene lost its words on a phone.** Two portraits plus two disabled buttons left the Recovering
line a few characters wide. The buttons are disabled during the pick anyway, so they step aside and
the scene gets the strip.

**Two comms lines at once.** On a wide window the board's footer and the covered COMMS console both
showed the scene. The console now rests while the pick is up.

## What is still open

Phase 3, the fun pass, starting with the balance simulation harness and the gameplay brainstorm.
