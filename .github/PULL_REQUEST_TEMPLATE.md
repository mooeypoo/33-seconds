## Summary
<!-- What changed and why, in a few sentences. Which slice or PRD section? -->

## Assumptions and decisions needed
<!-- Anything you assumed (also marked ASSUMPTION in code), and anything the owner should decide. "None" if none. -->

## Tests
<!-- Which behavior do the tests protect? Would each fail if that behavior broke? -->

## Checklist
- [ ] Typecheck, lint, tests, and the architecture boundary check pass
- [ ] No new `Math.random`, `Date`, or timers in `domain`
- [ ] Security, privacy, and accessibility rules in AGENTS.md respected
- [ ] PRD updated (with a changelog line) if rules changed, ADR updated if architecture changed
- [ ] Playable, and checked on a phone if the change affects controls or performance
