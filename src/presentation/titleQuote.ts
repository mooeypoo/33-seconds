import titleCopy from '../content/title.json';
import { createRandomStream } from '../domain/shared/random';

let chosen: string | null = null;

/**
 * One quote per visit (PRD 16): picked the first time anything asks, then the same until reload, so
 * the title and the standby comms console agree and a return to the title does not reshuffle it.
 */
export function titleQuote(): string {
  if (chosen !== null) return chosen;
  const quotes = titleCopy.quotes;
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  chosen = quotes[createRandomStream(buffer[0] ?? 1).index(quotes.length)] ?? '';
  return chosen;
}
