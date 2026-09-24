import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_SETTINGS,
  PLAYER_SETTINGS_KEY,
  PlayerSettings,
  effectiveReducedEffects,
  parsePlayerSettings,
} from '../src/application/playerSettings';
import type { StoragePort } from '../src/application/ports/StoragePort';
import { LocalStorageAdapter, MemoryStorageAdapter } from '../src/infrastructure/storage/LocalStorageAdapter';

class ThrowingStorage implements StoragePort {
  read(_key: string): unknown {
    throw new Error('blocked');
  }

  write(_key: string, _value: unknown): void {
    throw new Error('quota');
  }
}

class WriteFailStorage extends MemoryStorageAdapter {
  override write(_key: string, _value: unknown): void {
    throw new Error('quota');
  }
}

describe('parsePlayerSettings', () => {
  it('falls back when the value is missing or not an object', () => {
    expect(parsePlayerSettings(null)).toEqual(DEFAULT_PLAYER_SETTINGS);
    expect(parsePlayerSettings('muted')).toEqual(DEFAULT_PLAYER_SETTINGS);
    expect(parsePlayerSettings(1)).toEqual(DEFAULT_PLAYER_SETTINGS);
  });

  it('discards a future envelope instead of trusting its flags', () => {
    expect(parsePlayerSettings({ version: 99, muted: true, reducedEffects: true, dragHintSeen: true })).toEqual(
      DEFAULT_PLAYER_SETTINGS,
    );
  });

  it('treats anything other than boolean true as off', () => {
    const parsed = parsePlayerSettings({
      version: 1,
      muted: 'yes',
      reducedEffects: 1,
      dragHintSeen: {},
    });
    expect(parsed.muted).toBe(false);
    expect(parsed.reducedEffects).toBe(false);
    expect(parsed.dragHintSeen).toBe(false);
  });

  it('keeps only the known booleans from a valid envelope, and reads a missing newer one as off', () => {
    expect(
      parsePlayerSettings({
        version: 1,
        muted: true,
        reducedEffects: false,
        dragHintSeen: true,
        callsign: 'do-not-store-this',
      }),
    ).toEqual({
      version: 1,
      muted: true,
      reducedEffects: false,
      dragHintSeen: true,
      // Saved before the readable font existed: off, not a discarded envelope.
      readableFont: false,
    });
  });
});

describe('PlayerSettings', () => {
  it('starts from defaults when storage is empty', () => {
    expect(new PlayerSettings(new MemoryStorageAdapter()).snapshot).toEqual(DEFAULT_PLAYER_SETTINGS);
  });

  it('starts from defaults when storage throws on read', () => {
    expect(new PlayerSettings(new ThrowingStorage()).snapshot).toEqual(DEFAULT_PLAYER_SETTINGS);
  });

  it('mutes in memory when storage cannot write', () => {
    const settings = new PlayerSettings(new WriteFailStorage());
    settings.setMuted(true);
    expect(settings.snapshot.muted).toBe(true);
  });

  it('round-trips mute, reduced-effects, the readable font, and the drag hint through memory storage', () => {
    const storage = new MemoryStorageAdapter();
    const first = new PlayerSettings(storage);
    first.setMuted(true);
    first.setReducedEffects(true);
    first.markDragHintSeen();
    first.setReadableFont(true);

    const second = new PlayerSettings(storage);
    expect(second.snapshot).toEqual({
      version: 1,
      muted: true,
      reducedEffects: true,
      dragHintSeen: true,
      readableFont: true,
    });
  });

  it('writes the namespaced key, not a bare one', () => {
    const storage = new MemoryStorageAdapter();
    new PlayerSettings(storage).setMuted(true);
    expect(storage.read(PLAYER_SETTINGS_KEY)).toMatchObject({ muted: true });
    expect(storage.read('settings')).toBeNull();
  });
});

describe('effectiveReducedEffects', () => {
  it('respects the OS even when the in-game toggle is off', () => {
    expect(effectiveReducedEffects(true, false)).toBe(true);
    expect(effectiveReducedEffects(false, true)).toBe(true);
    expect(effectiveReducedEffects(false, false)).toBe(false);
  });
});

describe('LocalStorageAdapter', () => {
  const memory = new Map<string, string>();
  const fakeStorage: Storage = {
    get length() {
      return memory.size;
    },
    clear(): void {
      memory.clear();
    },
    getItem(key: string): string | null {
      return memory.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...memory.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      memory.delete(key);
    },
    setItem(key: string, value: string): void {
      memory.set(key, value);
    },
  };

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: fakeStorage,
    });
  });

  it('round-trips a plain object', () => {
    const adapter = new LocalStorageAdapter();
    adapter.write('k', { muted: true });
    expect(adapter.read('k')).toEqual({ muted: true });
  });

  it('returns null for garbage JSON instead of throwing', () => {
    fakeStorage.setItem('k', '{not json');
    expect(new LocalStorageAdapter().read('k')).toBeNull();
  });
});
