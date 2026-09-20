/**
 * The domain advances in fixed ticks and never reads a clock (ADR-0001 D2).
 * Every duration in the domain is expressed in ticks or in seconds-per-tick multiples.
 */
export const TICKS_PER_SECOND = 60;

export const TICK_SECONDS = 1 / TICKS_PER_SECOND;
