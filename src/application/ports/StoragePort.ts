/**
 * Untrusted local persistence (ADR-0001 D10). The adapter must never throw: quota errors and
 * private-browsing blocks are normal. The game works with storage unavailable.
 *
 * Keys are namespaced by the caller. Values are JSON-serializable plain objects.
 */
export interface StoragePort {
  /** `null` when missing, unreadable, or the adapter swallowed an error. */
  read(key: string): unknown;
  write(key: string, value: unknown): void;
}
