import type { StoragePort } from '../../application/ports/StoragePort';

/**
 * localStorage behind StoragePort (ADR-0001 D10). Untrusted, optional, never throws.
 */
export class LocalStorageAdapter implements StoragePort {
  read(key: string): unknown {
    try {
      const raw = globalThis.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      globalThis.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota, private browsing, disabled storage: the in-memory settings still hold.
    }
  }
}

/**
 * In-memory stand-in for tests, and for a session where localStorage is missing entirely.
 */
export class MemoryStorageAdapter implements StoragePort {
  private readonly values = new Map<string, unknown>();

  read(key: string): unknown {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  write(key: string, value: unknown): void {
    this.values.set(key, value);
  }
}

/** localStorage when it exists and does not throw on first touch; otherwise memory. */
export function createStoragePort(): StoragePort {
  try {
    // Touch it: some browsers throw on any localStorage access, even a read.
    globalThis.localStorage.getItem('');
    return new LocalStorageAdapter();
  } catch {
    return new MemoryStorageAdapter();
  }
}
