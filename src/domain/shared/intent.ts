/**
 * Everything the player can ask for in one tick, whatever device they are using (ADR-0001 D6).
 * `moveX` and `moveY` are analog in the range -1..1, where -1 is left and up.
 * The domain treats this as untrusted input and clamps it.
 */
export interface InputIntent {
  readonly moveX: number;
  readonly moveY: number;
  readonly missile: boolean;
  readonly special: boolean;
}

export const IDLE_INTENT: InputIntent = {
  moveX: 0,
  moveY: 0,
  missile: false,
  special: false,
};

/**
 * Keeps the requested direction inside the unit circle, so a diagonal is never faster than a
 * straight line no matter what an adapter sends. Non-finite values become zero.
 */
export function clampIntentDirection(moveX: number, moveY: number): { x: number; y: number } {
  const x = Number.isFinite(moveX) ? moveX : 0;
  const y = Number.isFinite(moveY) ? moveY : 0;
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 1) return { x, y };
  return { x: x / magnitude, y: y / magnitude };
}
