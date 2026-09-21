import type { InputPort } from '../../application/ports/InputPort';
import type { InputIntent } from '../../domain/shared/intent';

/**
 * Edge-triggered buttons on the overlay (ADR-0001 D6). Vue calls `pressMissile` / `pressSpecial`;
 * the next `readIntent` consumes them. The composition root wires this into CombinedInput, so
 * presentation never imports infrastructure.
 */
export class ButtonLatchInput implements InputPort {
  private missileLatched = false;
  private specialLatched = false;

  pressMissile(): void {
    this.missileLatched = true;
  }

  pressSpecial(): void {
    this.specialLatched = true;
  }

  readIntent(): InputIntent {
    const missile = this.missileLatched;
    const special = this.specialLatched;
    this.missileLatched = false;
    this.specialLatched = false;
    return { moveX: 0, moveY: 0, missile, special };
  }

  clear(): void {
    this.missileLatched = false;
    this.specialLatched = false;
  }
}
