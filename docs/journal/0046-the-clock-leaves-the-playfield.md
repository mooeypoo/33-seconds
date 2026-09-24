# 0046 — The clock leaves the playfield

**Date:** 2026-09-24
**Slice:** ADR-0002 Phase 1, quick UX wins
**Ends with:** a HUD that says what is happening in words, a clock you can read without looking
under your own ship, and buttons that no longer sit on the fleet.

---

## What we set out to do

Seven fixes from the review, none of them a redesign: tokens, fonts, the text tells in a release
build, touch-only buttons off the fleet, the countdown out of the playfield, an objective line, and
reduced effects without a reload. The CIC layout is Phase 2.

## What we decided

The owner picked three things from mock-ups: **VT323** for the display face (a terminal look with
real lowercase), the **countdown in the top band** beside fleet health, and the **buttons flanking
the comms strip** on a phone.

Sentences stay in Atkinson Hyperlegible. VT323 is lovely for "FLEET HEALTH 91%" and tiring for a
card's effect in three lines.

The objective line's copy nearly said "Hit it when the bays open." That is only true with *Hangar
Door Slam*; without the card, open bays change nothing. The PRD says advice never misleads, so the
line just says to destroy the ship.

## What we measured

- 140 hard-coded colour values replaced by tokens, with the exact colours kept.
- Fonts: four woff2 files, 71 KB together, self-hosted under the existing `font-src 'self'`.
- Unit tests: 209 (4 new for the objective stage and the jump bar; settings extended for the new
  setting and for an older save that lacks it).
- End-to-end: 43 passed, 7 skipped by device (6 new checks: buttons under the playfield on a phone,
  no buttons on a desktop, status words on both).

## What surprised us

**VT323 is a quarter smaller than it looks on paper.** At the sizes tuned for the old monospace, it
read like fine print. `font-size-adjust` fixed that in one place instead of forty.

**The browser was inventing bold.** VT323 has one weight, so "33 Seconds" and "Jump complete" were
smeared by synthetic bold, and the jokes were slanted by a fake italic. `font-synthesis: none` and a
real Atkinson italic fixed both.

**Moving the clock cost the phone some width.** The top band grew by a status row and an objective
line, and the 9:16 playfield now letterboxes a few percent on each side. That is noted for the CIC
layout, which can fold the objective into the status row.

**A laptop showed a clock that said "Jumped 0".** Between cycles there is nothing to count, so the
number now goes away and the caption does the talking.

## What is still open

Phase 2: the CIC layout mock-up. The brainstorm list in the UI review, now with the phone-width note.
