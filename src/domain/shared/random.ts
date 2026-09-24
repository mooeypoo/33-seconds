/**
 * Seeded randomness (ADR-0001 D3). The domain never reaches for `Math.random`: a stream is created
 * from a seed and passed in, so tests are repeatable and the balance harness can replay a run with the
 * same inputs. Players get a fresh seed per run; nothing promises them a shared scenario.
 *
 * Streams are separate on purpose. `scenario` decides what spawns; `cosmetic` and `banter` arrive
 * later and must never touch the simulation, because picking a joke cannot be allowed to change a
 * run.
 */
export interface RandomStream {
  /** A number in [0, 1). */
  next(): number;
  /** A number in [min, max). */
  between(min: number, max: number): number;
  /** An integer in [0, countExclusive). */
  index(countExclusive: number): number;
}

/**
 * mulberry32: 32 bits of state, good enough for spawn positions and card offers, and short enough to
 * read in one sitting. Not cryptographic, and it does not need to be.
 */
export function createRandomStream(seed: number): RandomStream {
  // Keep the state a uint32 so the arithmetic below stays exact.
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let scrambled = state;
    scrambled = Math.imul(scrambled ^ (scrambled >>> 15), scrambled | 1);
    scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
    return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    between: (min, max) => min + next() * (max - min),
    index: (countExclusive) => Math.floor(next() * countExclusive),
  };
}
