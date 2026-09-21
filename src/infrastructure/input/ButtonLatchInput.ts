import type { InputPort } from '../../application/ports/InputPort';
import type { InputIntent } from '../../domain/shared/intent';

/**
 * Edge-triggered buttons on the overlay (ADR-0001 D6). Vue calls `pressMissile`; the next
 * `readIntent` consumes it. The composition root wires this into CombinedInput, so presentation
 * never imports infrastructure.
 */
export class ButtonLatchInput implements InputPort {
  private missileLatched = false;

  pressMissile(): void {
    this.missileLatched = true;
  }

  readIntent(): InputIntent {
    const missile = this.missileLatched;
    this.missileLatched = false;
    return { moveX: 0, moveY: 0, missile, special: false };
  }

  clear(): void {
    this.missileLatched = false;
  }
}
