/**
 * Asked every time an effect is about to play, so the pause-menu toggle and the OS setting apply
 * at once, not after a reload (PRD 15, ADR-0002 1.7). True means reduce.
 */
export type ReducedEffectsSource = () => boolean;
