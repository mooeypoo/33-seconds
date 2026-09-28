# 0065 — Sixty-six

**Date:** 2026-09-28
**Slice:** challenges, part 4 of 4 (PRD 5.1, 11.1; ADR-0004)
**Ends with:** *Baltar's FTL upgrade*, a challenge with 66-second cycles: the one place the game's
33-second clock is allowed to change.

---

## What we set out to do

The 33 is the game's name and its identity (PRD 5.1), and the code said so: `jumpCycle.ts` called
the numbers "not tunables". The owner wanted one challenge where the FTL is slow, with a joke for a
reason: Baltar improved the jump drive, and it is twice as reliable and twice as slow. The job was
to let exactly one challenge change the clock without turning the clock into a knob.

## What we decided

- **A union, not a number.** The cycle length is `CycleSeconds`, `33 | 66`. A future writer cannot
  set it to 40 in a JSON file; adding a length is a code change and a conversation.
- **Only building gets longer.** Arriving stays 0 to 5 seconds and the spool the last 8 (58 to
  66). `SPOOL_SECONDS` is derived from the 33-second constants, and `JumpCycle` works out where the
  spool starts from the length it was given. So every tell ("Spooling", the amber clock) and every
  comms call ("five seconds") means the same thing in both.
- **The HUD reads the length from the view.** The clock and the FTL ring already counted down from
  whatever was left, so they were right for free. The one bar that divided by 33 now divides by
  `cycle.combatSeconds`. That was the only reader of the constants outside the cycle class.
- **The tier's own fleet numbers.** We expected to need new ones and did not (below).

## What we measured

`npm run sim`, 30 runs, Slow FTL with different fleets:

| Cap, repair | Idle won | Hunter won | Guard won |
|---|---|---|---|
| 45, 40% (Viper Pilot's) | 0% | 50% | 30% |
| 60, 40% | 0% | 10% | 3% |
| 70, 45% | 0% | 7% | 10% |
| 80, 50% | 0% | 17% | 10% |

The full report at 60 runs, with Viper Pilot's numbers: hunter 57% won, guard 23%, idle never, in
about 6 minutes. On Viper Pilot's 33-second cycles the hunter wins 87% and the guard 3%.

## What surprised us

- **A higher cap made it harder, not easier.** The intuition was that a cycle twice as long needs a
  cap twice as high to be fair. But the cap is a ceiling on what a cycle *can* take, and a long
  cycle nearly always takes it all. Raising the ceiling just raised the bill. With Viper Pilot's cap
  a long cycle is capped sooner, so a 66-second cycle costs the fleet about what a 33-second one
  does, while the pilot gets twice the time to fight.
- **The guard bot finally wins.** It protects the fleet and never goes after the resurrection ship
  on purpose. At 33 seconds it almost never gets the ship down (3%). At 66, long cycles give its
  stray fire time to do it (23%). Slow FTL rewards defending more than Story mode does.
- **The guardrail anchor moved twice.** `prove-guardrails.mjs` finds one sabotage by an exact
  import line in `runSim.ts`. Slice 3 changed that line and the proof skipped the sabotage (counted
  as unnoticed); this slice changed it back. Each time the fix was one line, and a hand run of the
  sabotage confirmed `check:arch` still catches it.

## What is still open

- A few placeholder comms lines say "thirty-three" ("Give me thirty-three seconds and a miracle",
  "Another 33"). In a 66-second run they are wrong in a way that might be funny or might read as a
  bug. The content pass can reword them or give them a condition.
- Endless and Slow FTL are not in the weekly pool. Each pair would need a sim row first.
- `npm run sim` now takes six to nine minutes: every challenge, every weekly pair, and Endless to
  40 cycles.
