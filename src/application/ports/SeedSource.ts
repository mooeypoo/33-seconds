/**
 * Where a new run's seed comes from (ADR-0002 D1). Runs are random for players and seedable for
 * tests: the browser supplies fresh entropy, and a test or the simulation harness supplies a fixed
 * number. A seed is not a promise that a run can be replayed.
 */
export type SeedSource = () => number;
