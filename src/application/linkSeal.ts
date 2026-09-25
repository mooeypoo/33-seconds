import { createRandomStream } from '../domain/shared/random';

/**
 * Wraps a share link's payload so the link does not read as a list of numbers to edit (PRD 17).
 *
 * This is a seal, not encryption. The payload gets a checksum, is XORed with a fixed keystream,
 * and is written as base64url: `#r=kX9...`. Changing any character breaks the checksum, so a hand
 * edit opens the title instead of a better score. Anyone who reads this file can still forge a
 * link. That is acceptable: a forged link only fools the person reading it, and nothing is stored.
 */
const PREFIX = 'r=';
/** Arbitrary, and part of the format: changing it breaks every link already shared. */
const KEYSTREAM_SEED = 0x33c0de;
const CHECKSUM_SALT = 0x5eed33;
const CHECKSUM_BYTES = 4;

/** FNV-1a, 32 bits. Enough to notice an edit; not meant to resist a determined forger. */
function checksum(bytes: Uint8Array): number {
  let hash = (0x811c9dc5 ^ CHECKSUM_SALT) >>> 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function scramble(bytes: Uint8Array): Uint8Array {
  const stream = createRandomStream(KEYSTREAM_SEED);
  return bytes.map((byte) => byte ^ stream.index(256));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

/** The fragment for `payload`, without the `#`. */
export function sealLink(payload: string): string {
  const body = new TextEncoder().encode(payload);
  const sealed = new Uint8Array(CHECKSUM_BYTES + body.length);
  new DataView(sealed.buffer).setUint32(0, checksum(body));
  sealed.set(body, CHECKSUM_BYTES);
  return PREFIX + toBase64Url(scramble(sealed));
}

/** The payload inside a fragment (with or without its `#`), or null if it is not one or was edited. */
export function openLink(hash: string): string | null {
  const code = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!code.startsWith(PREFIX)) return null;
  const text = code.slice(PREFIX.length);
  const scrambled = fromBase64Url(text);
  // Base64 has spare bits in its last character; re-encoding makes sure no edit hides there.
  if (!scrambled || scrambled.length <= CHECKSUM_BYTES || toBase64Url(scrambled) !== text) return null;
  const sealed = scramble(scrambled);
  const body = sealed.subarray(CHECKSUM_BYTES);
  if (new DataView(sealed.buffer).getUint32(0) !== checksum(body)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    return null;
  }
}
