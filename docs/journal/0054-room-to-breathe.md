# 0054 — Room to breathe

**Date:** 2026-09-24
**Slice:** playtest follow-up, comms pacing (PRD 12.2, 12.3)
**Ends with:** a comms strip that goes quiet between lines, a clean break at every jump, and one
line on the pick screen instead of a conversation.

---

## What we set out to do

The owner's playtest had two complaints. The comms never stopped: a line cleared and another took
its place, all cycle long. And the pick screen between cycles kept "playing one after the other at
the bottom", as if the fight's log was still running while you chose a card.

Left out: new lines, the Short/Normal/Long duration setting, and anything in the domain. This is
pacing, not content.

## What we found

**The strip was never idle, but it was not queueing either.** Banter already dropped a line that
could not speak. The chatter came from three other places:

- Nothing waited between lines. The moment a line expired, the next event filled the strip.
- Cooldowns were per joke, not per speaker. Starbuck's missile pool has ten jokes and a 15 s
  cooldown, so she could answer ten missiles in a row before any cooldown mattered.
- The louder pool always won a moment. On a fleet hit, Dualla and Gaeta (normal) beat Tigh and
  Baltar (flavor) every time, so the flavor pools only spoke while the reports were cooling down.

**The pick screen was the Recovering scene.** Two to four beats, up to 12 s, exactly as PRD 12.3
said. It worked as designed and still read as the log running on, partly because each beat also
landed in the comms log beside the fight's lines.

## What we decided

- **One responder per moment.** Everyone who could answer an event has the same chance, whatever
  their priority. Between two moments in the same frame, the louder one still wins.
- **3 s of quiet after a line.** Only a critical line (the jump countdown) speaks into it. A new
  cycle clears it, so Adama never waits to open.
- **At most 3 flavor lines a cycle.** Reports and the countdown do not count.
- **Fresh over stale.** A flavor line that has been up 2 s gives way to a newer one, so the strip
  follows the fight. A report is never pushed off by another report or by a joke.
- **A character's cooldown covers the whole moment.** Critical calls keep one per line, or the
  spool countdown could not speak at 5 s and 2 s.
- **Chance in the content:** missiles at 0.25, close calls and each fleet-hit pool at 0.5.
- **The jump is a clean break.** It silences the strip and empties the log, in the console and the
  pause menu alike. Between cycles nothing speaks but one Recovering line: Tyrol's opener for the
  damage band. The card-advice lines stay on the cards.

All three numbers are guesses to tune in play.

## What we measured

- First 33 s of a headless run (idle pilot, default tier), the same seed before and after: **13
  lines and the strip never empty** before; **7 lines and the strip empty 29% of the time** after.
- A traced two-cycle run: the log drops to 0 at the jump and holds only Tyrol's line on the pick
  screen, and Adama opens the next cycle straight away.
- Unit tests: 294 → 302, all passing. Every new rule was broken on purpose once; one mutation (a
  report replacing a report after 2 s) survived, and got its own assertion.
- Guardrails: 81 → 85 sabotages. The old "critical cannot replace flavor" sabotage pointed at code
  that no longer exists and was re-aimed.

## What surprised us

**A test found a leak the plan missed.** The session test asserted an empty strip during the 1 s
jump, and Tigh said "are they hiding from you now?" right through it. The kill-drought cue stays
pending until someone accepts it, and the jump frame was the first empty strip it saw. So the rule
became "nothing but the Recovering line between cycles", not only "the scene has the strip".

**One long step broke the gap.** A test that advanced 20 s in one call started the gap at the end of
the call instead of when the line ran out. The session never takes steps that long, but the fix was
one line and makes the rule true at any step size.

## What is still open

- **The spool is now the loudest part of a cycle.** Three critical calls in the last 8 s (start,
  5 s, 2 s), and critical skips the gap. Dropping the 5 s call is the next knob if it still feels busy.
- **Fleet-hit chance is per pool.** Four speakers at 0.5 still means about 94% of eligible hits get
  a line. A trigger-wide cooldown would thin it more, if play says so.
- **Scenes keep their other beats, unread.** Trim them to one line, or bring a second beat back?
- **The Recovering line could be the card advice instead.** It helps the pick more; Tyrol's line
  says how the cycle went. Owner's call.
- **A flicker remains,** as before this change: a Six remark replaced a frame later by a louder hull
  warning still lands in the log.
- **The partner portrait is now unused.** `CommsLine.partnerName` and the overlay's second portrait
  only served multi-beat scenes. Left in place until the scene question is settled.
