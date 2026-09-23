# 0031 — The title says it

**Date:** 2026-09-22
**Slice:** put the written title and the Recovering scene where a player reads them
**Ends with:** the title showing its pitch, disclaimer, and one quote, and the jump conversation sitting on the Recovering screen.

---

## What we set out to do

`title.json` already had the name, two pitch lines, the disclaimer, and six quotes. The
Recovering scenes already played, as a thin strip over the cards. Show the title copy,
one quote each visit, and make the scene part of the Recovering screen.

Do not write the nine scenes the schema still wants. Do not write Starbuck's replies or
Six's portrait.

## What we built

The title reads `title.json`. Both pitch lines and the disclaimer are the same every
visit. One quote is chosen when the title appears, from the browser's random bytes fed
into the same seeded stream the rest of the game uses. There is no timer on it. The
difficulty lines, the sound notice, mute, both launch buttons, and the control hint stay,
because those are rules. The title scrolls if the phone is short.

During Recovering the floating strip is hidden and the same line is drawn at the top of
that screen, with both letter portraits. Touches on it pass through. Picking a card still
waits for the scene to finish.

## What we assumed

One quote per visit is the title contract in the line review. The quote uses a fresh
seed each time the title mounts, so two visits can differ. It does not touch the run's
scenario or banter streams.

## What we tested

The title shows the written heading, the first pitch line, the disclaimer, and a quote
from the six. The jump still names both advisors, still speaks, and a chosen card still
waits.

## What is still open

1. **Soon:** JSON objects per difficulty, before a third tier.
2. **Soon:** share a finished run.
3. **Later:** a harder return after a win.
4. **Later:** wingman guards, and the heavy Raider those entrance lines are for (PRD 12.5 for the wingmen).
5. More Recovering scenes. Starbuck's half of the Six conversation. Six's portrait.
6. The comms log and the duration setting.
7. AudioPort and the first sound, after the graphics pass.
8. Full settings screen (M6).
9. Retry-from-last-jump, epilogue.
10. Mid-cycle life pickups.
11. Straight-down fire.
12. A quiet FTL border when 10 or 5 seconds remain.
13. Graphics pass.
14. Ship path, panic, escape FTL, slow-mo.
15. Missile pickups, blast radius, Later cards.
