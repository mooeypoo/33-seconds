# 0035 — The face of the cabinet

**Date:** 2026-09-22
**Slice:** give the title a face, and put the manual one step away
**Ends with:** a short title, a How to fly sheet, and a credits sheet. The wordmark is still type.

---

## What we set out to do

The title was one narrow column: two pitch lines, a quote, a difficulty essay, the sound
notice, both launches, a control paragraph, and the disclaimer. On a wide monitor that
column sat in the middle of a dark page. On a phone it was the whole screen, and it was
all the same size.

An arcade cabinet never put the manual on the monitor. The marquee says what the game is.
The instruction card, on the panel, says how. A returning player inserts a coin. Nielsen
Norman calls the same split progressive disclosure: the first screen holds what most
sessions need, and the rest is one labeled step away, not two.

## What we decided

The face holds the name, the first pitch line, one quote, Launch and Civilian Run, the
sound choice, one control line, How to fly, Credits, and the disclaimer. How to fly holds
the second pitch line, the full controls, and the rules: the jump, the fleet, missiles
and the Speech, the resurrection ship, and the card pick. Credits names Moriel
Schottlender, moriel.tech, and the GitHub repository. Esc or Back closes either sheet,
and the title stays mounted so the quote does not reroll.

On a wide window the two halves of the face sit on either side of the portrait playfield,
which is the letterbox the art direction already reserved. Under 960 px they stack, with
the playfield still showing between them. How to fly is two tabs. The debug readout stays
off the face, because the playfield is visible there and the line was noise.

## What we revisited

The right-hand stack was still one block. Launch now sits in its own box. Civilian Run
sits below it, marked Easy run: the same fight, an easier fleet, which is why it is not
labeled a tutorial. How to fly is two tabs, Controls and How to play, and the lines in
both are short. The face says it is fan art inspired by Battlestar Galactica. Credits
adds the episode "33" and keeps the line that nobody endorsed this.

No pixel font. A display face that is hard to read would land on the manual, which is the
part people open because they need the words. The wordmark is tracked type in Dradis
green, with the Viper picture beside it, until `title_logo` is drawn at 800×240.

Launch moved onto the empty playfield. The well was already a hole in the face; the coin
slot belongs there, because nothing else is on that screen until a run starts. How to play
now opens with the goal of the run, then the mechanics. The Speech is named as a rare
weapon that stops attacking Cylons. A click on the dark around a sheet closes it.

During a run the playfield is a little shorter than the window. Fleet health is a
percentage on the same line as the dialogue. Speeches stay in that column, on a phone and
on a desktop alike, so they are not lost in the side margins. Where those lines should
live once the portraits exist is still open. The 33 is painted in the playfield, just
above the fleet, behind the ships. The debug readout floats in the desktop margin while
we test, and a shipped build leaves it out. Launch says the fleet is in your hands.

## What we left out

An attract-mode demo and a webfont. A short first-run tutorial is something to look into
later. Civilian Run is still the same fight with an easier fleet, not that lesson. Cycle 1
is still the teacher until that exists.
