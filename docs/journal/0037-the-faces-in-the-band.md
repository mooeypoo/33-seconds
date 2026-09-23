# 0037 — The faces in the band

**Date:** 2026-09-23
**Slice:** show the comms portraits
**Ends with:** nine faces beside the line. Signature is still the closed mouth.

---

## What we set out to do

Put the portrait files on the comms line. Leave the line where it is, above the playfield.
The bottom strip and the larger desktop face stay a later pass.

## What we decided

Closed, open, and blink are the pictures. Signature is not drawn, so that pose uses the
closed file. The mouth changes twice a second, and a blink takes one of those steps about
every four seconds. That stays under the flash limit. Reduced effects holds the closed
mouth. Pause freezes the face because the step follows the game tick, the same clock the
line already uses. The other person in a scene stays on closed, since they are not the
one talking. A name with no picture still gets the letter block.

## What is still open

The signature drawings. The bottom strip, and showing this same file at about 128 CSS
pixels in the side margins on a large screen.
