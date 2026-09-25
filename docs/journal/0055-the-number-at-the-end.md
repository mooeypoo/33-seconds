# 0055 — The number at the end

**Date:** 2026-09-24
**Slice:** ADR-0002 5.2, score, end screen, and share link (PRD 5.4, 17)
**Ends with:** one end screen for a win and a loss, with a score, the run's numbers, a joke stat,
a headline that is excited or sad, a link that opens the same screen for a friend, and a PNG of it.

---

## What we set out to do

Win and loss were two placeholder boxes with no score. The review called it "no reason to play
again", and PRD 17 already promised a share link that talked about points that did not exist.

The owner asked for four things: the score, an excited or a funny-sad message, a share button whose
link anyone can open (and maybe an image), and a quick way to look at the screens without playing a
whole run. Later, in chat: every score weight in one place, the game version on a shared result, and
the debug buttons allowed in the test build but never in production.

Left out: a score in the HUD during play, best scores in storage, a leaderboard, retry from the
last jump, the loss epilogue, and real jokes.

## What we built

- **A score the domain can compute and the data can tune.** `RunTally` reads the run's events (kills,
  heavies, ejects, fleet hits) and the final view (the resurrection ship's hull, the fleet left).
  `scoreRun` applies eight weights from `src/balance/scoring.json`. Never below zero.
- **One end screen.** The outcome in words and colour, a headline from `src/content/endings.json`,
  the score, six numbers, the cards held, and "Most-killed Raider: #14, 12 times. Still not over
  it." The identity already rode on every spawn, so the joke stat cost a map.
- **A link with the result inside.** `#run?v=1&g=0.1.0&o=won&s=1772&...`, about 200 characters. The
  fragment never reaches Netlify, so there is nothing to store and no server to write. Reading it
  is as suspicious as reading localStorage.
- **An image from the page itself.** Canvas 2D, the self-hosted fonts, the Viper sprite, 1200×630.
  It goes to the clipboard, or to the share sheet or a download where the clipboard will not take
  a picture. No dependency and no CSP change.
- **Simulate win / Simulate lose**, bottom-left on the title in `npm run dev` and the test build.
  Each press walks to the next headline.

## What we measured

- **The first weights were wrong, and the simulator said so before anyone played.** With −50 per
  eject and −5 per percent of fleet lost, every simulated loss scored 0, including a guard bot with
  196 kills. Fleet damage adds up over a run (about 45 points a cycle on Viper Pilot, and repairs do
  not refund it), so the penalty swamped everything. At −20 and −2: wins 1,500 to 1,900, losses 0 to
  about 650, and the idle bot still 0. `npm run sim` now prints both medians.
- Unit tests: 302 → 326. Content checks: 14 → 16. End-to-end: three new flows on desktop and phone
  (share a win and open it in a second page, copy a loss's image, a tampered link).
- Production build: the dev buttons are absent, and a forced leak fails the build. Guardrails: 85 →
  96 sabotages.

## What surprised us

**A share link is user input.** It was easy to think of it as ours, since the game writes it. But
anyone can hand-edit a URL, so it gets the localStorage treatment: every field bounded, a repeated
key or a win with the ship still flying rejects the whole link. A retired card is dropped rather
than rejected, so an old link still opens after the catalog changes.

**Dropping the dev buttons from production needed proof, not a comment.** A build-time constant plus
a dynamic import should tree-shake, and it did. But "should" is what a post-build grep is for.

## What is still open

- **The weights are a first guess** tuned against bots, which eject far more than people. The
  playtest decides.
- **Placeholder headlines,** five a side, for the content pass. The schema is in CONTENT-SCHEMA 6b.
- **The image leaves out the cards.** Worth a look once the
  real lines exist.

## Follow-up, 2026-09-25

**The link showed the score.** `#run?...&s=1772&...` all but asks to be edited. The payload is now
sealed: a checksum, a fixed scramble, and base64url, so the link reads `#r=kX9...` and any edited
character opens the title. It is not encryption, and cannot be without a server, because the key
ships with the game. That is fine: a forged link fools only its reader.

The breakage suite earned its keep twice. Swapping random characters missed the spare bits in
base64's last character, which decode to the same bytes, so an edit there went through. The decoder
now re-encodes and compares, and the test tries every character in the last position at three
lengths. And with the scramble removed the link was still unreadable at a glance but one `atob`
from plain, so the test now decodes it too.

**The version reminder is built.** `src/balance/fingerprint.json` holds a hash of the tier and score
numbers and the version it was taken at. Change either file and `check:content` fails, saying to
bump the version if scores move and printing the line to paste. It sits in its own check file, so
the sabotages that corrupt the balance files still prove the validators rather than the reminder.

Tests: 326 → 327 unit, 16 → 17 content. Guardrails: 96 → 100.

**The joke after the stat varies now.** The owner's content pass kept "Most-killed Raider: #7, 14
times." fixed and wanted the punchline to change. `mostKilled.reactions` is a plain list of strings,
one drawn per run from the same cosmetic stream as the headline. The link carries its position, not
its words: a list of strings is easier to write than one with ids, at the cost that reordering the
list changes which joke an old link shows. New reactions go at the end. The dev buttons step through
them in order, so every one can be read without luck.

