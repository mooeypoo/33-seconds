# 0058 — Out of the way

**Date:** 2026-09-25
**Slice:** the Training Run's lesson cards place themselves around what they are about (PRD 5.5)
**Ends with:** every lesson card sitting at the top, middle, or bottom of the lane, wherever it
keeps its subject in view, with that subject ringed in amber.

---

## What we set out to do

After 0057 the owner played the new sim. The stray round lesson worked: the card sat above the
round, with rings on the round and on fleet health. But the hull lesson ("the pips on your Viper")
and the eject lesson put their card right on top of the Viper they were talking about. The Viper
spends its time low in the lane, and the card's default spot was the bottom.

The ask: make the stray lesson's behaviour the rule, not a special case, so the card lands clear of
whatever each lesson is about. The owner's calls, made in chat:

- When a phone card is too tall to miss everything, keep the subject clear and do not go further
  out of the way.
- Missile and Speech lessons should show their buttons.

## What we built

- **Every trigger has a subject.** The Viper for a hit or an eject, the round, the diving Raider,
  the Returned Raider, the heavy, the resurrection ship, or the spot where a drone died. The Viper
  and the ship are always on screen, so a lesson shown at its deadline can point at them too.
- **One resolver, two readers.** `lessonFocus` turns a lesson into boxes in world units. The Phaser
  presenter rings the subject from those boxes, and the card places itself from the same boxes, so
  the ring and the gap the card leaves always agree.
- **A small placement rule.** `chooseCardSlot` tries the bottom, top, and middle of the lane. It
  counts what each slot would cover, most important first (the subject, then the fleet row), and
  picks the slot that covers least. The card measures its real height, picks once when it appears
  (before the first paint), and never moves while it is up.
- **Rings stay in the script.** `focus: ["subject"]` still decides whether a ring is drawn. It is
  now on the hull, eject, Returned, heavy, and ship lessons. Placement avoids the subject either
  way, so the writer never has to think about where the card goes.
- **Buttons.** The missile and Speech buttons live in the strip under the lane, so the card could
  never cover them. What was missing was the outline: `missile` and `speech` are now focus targets,
  on the phone buttons and on the readouts in the wide layout's console.

## What we measured

A scripted pass through the sim on a phone and a desktop viewport, with one screenshot per lesson.
The idle Viper sits low, the worst case:

- The hull and eject cards went to the top.
- The heavy, ship, and Returned cards stayed at the bottom, since their subjects are high.
- The welcome and stray cards went to the top, clear of the fleet.
- On a phone, the four-line strafe card could not miss both the diving Raider and the fleet row.
  It kept the Raider clear, as agreed.

## What surprised us

- **The strafe lesson pointed at nothing about one run in three.** It waits out the 3-second gap,
  and the Raider that dived first could be shot down by then. The new "every ring has something to
  ring" test caught it. The lesson now points at whichever Raider is diving when it shows.
- **That test's first version protected nothing.** It skipped every card without a subject,
  deleting the Returned Raider's subject passed it, and breaking the code on purpose showed that.
  Now a card may lack a subject only when it shows its deadline lines.
- **The first guardrail run of the previous commit was killed by a timeout mid-sabotage.** It left
  one broken line behind. It was restored before this slice, and the two checks it had skipped
  were run by hand.

## What is still open

- On a phone, the long cards (four lines) cover most of the lane whatever the slot. Shorter lines
  in the content pass would let placement do more.
- A card that does not point at anything (missiles, the Speech) can still cover the Viper. That
  seems fine, since the clock is held, but play will tell.
- The Phaser-side ring is still not unit tested (ADR-0001 D13). The screenshots are its check.
