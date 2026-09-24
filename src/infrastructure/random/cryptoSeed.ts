import type { SeedSource } from '../../application/ports/SeedSource';

/** A fresh 32-bit seed per run from the browser's CSPRNG. Kept out of the domain (ADR-0001 D1). */
export const cryptoSeed: SeedSource = () => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
};
