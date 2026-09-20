# 0006 — Ghosts refill the swarm

**Date:** 2026-09-20
**Slice:** third slice of M2
**Ends with:** a kill that comes back. The same Raider, marked Returned, after a download.

---

## What we set out to do

The clock and the hull made this a run. A kill still *removed* a Raider. That is the opposite of
the joke. This slice is the loop: destroy, wait, "all of this has happened before."

Not in this slice: a second live Raider, attack tokens, fleet damage, the resurrection ship, or
Vengeful. The Director cap is 1 so a refill is visible as empty sky and a ghost, not as more
bodies.

## What we built

- A destroy queues a **download** (6 s). The body is gone. A grey diamond sits where it died, and
  the HUD says `ghost 1`. That slot stays reserved: nothing fresh spawns on top of a pending soul.
- When the download finishes, the same identity comes back from the top of that column, marked
  **Returned** (a ring, not only a colour), with 1.5 s of spawn protection. Shots pass through so
  the window is not a free kill and ammo is not wasted.
- A jump wipes a live Raider without queuing a ghost. Pending downloads finish in transit and
  arrive first after Continue. Recovering still does not tick them.

## What we assumed

- Returned drop in from the top, not on the death pixel. Readable, and they come from the swarm
  side the way a fresh spawn does.
- Director cap stays at 1 until there is a reason to draw a second body. Attack tokens wait on
  that, because a token pool of one is a comment.

## What we tested

A kill is a ghost, not a new ship; the same identity returns after six seconds; shots pass through
protection and dent afterwards; a late kill survives the jump and is Returned on Continue; a jump
without a kill is still a fresh spawn. Two sabotages: a download that finishes instantly, and
protection that is only a flag.

## What we heard from play

The diamond is a ghost, but it does not read as a download. A blink was suggested; we will not do that
(comfort, and it still does not name the wait). A quiet five-notch bar now fills under the diamond.
The HUD still says downloading, so the bar is never the only cue.

Killing the Viper is too easy and killing the Raider is too hard. Hull stays at 3 and the hitbox
stays at 6 wu until a fairness pass that can raise hull, maybe add mid-cycle pickups, and widen
the Raider together. First play ejected too fast for the joke to land.

## What is still open

1. A fairness pass: hull, maybe hearts, Raider hitbox. Together, not live.
2. A second Raider, then attack tokens.
3. Fleet damage from the stray tell we already have.
4. The quieter 33, still waiting on the M5 HUD.
