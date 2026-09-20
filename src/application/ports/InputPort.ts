import type { InputIntent } from '../../domain/shared/intent';

/**
 * Implemented by input adapters in the infrastructure layer (keyboard, pointer stick, later a
 * gamepad). The application layer reads the current intent once per tick and never learns how the
 * player produced it (ADR-0001 D6).
 */
export interface InputPort {
  /** What the player is asking for right now. */
  readIntent(): InputIntent;

  /**
   * Drops all held state. Called when the session pauses or resumes, so a key held during a blur
   * or a finger lifted off-screen cannot keep steering (PRD 13.3).
   */
  clear(): void;
}
