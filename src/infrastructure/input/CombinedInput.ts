import type { InputPort } from '../../application/ports/InputPort';
import type { InputIntent } from '../../domain/shared/intent';

/**
 * One intent out of several devices (ADR-0001 D6). The touch stick wins while a finger is down,
 * because on a phone a stale keyboard state should never fight the thumb; otherwise the keyboard
 * decides. Buttons are an OR across devices.
 */
export class CombinedInput implements InputPort {
  private readonly sources: readonly InputPort[];

  /** In priority order: the first source that asks for movement provides it. */
  constructor(...sources: InputPort[]) {
    this.sources = sources;
  }

  readIntent(): InputIntent {
    let moveX = 0;
    let moveY = 0;
    let missile = false;
    let special = false;
    let steering = false;

    for (const source of this.sources) {
      const intent = source.readIntent();
      // Read every source each tick: edge-triggered buttons must not be left latched.
      missile = missile || intent.missile;
      special = special || intent.special;
      if (!steering && (intent.moveX !== 0 || intent.moveY !== 0)) {
        moveX = intent.moveX;
        moveY = intent.moveY;
        steering = true;
      }
    }

    return { moveX, moveY, missile, special };
  }

  clear(): void {
    for (const source of this.sources) source.clear();
  }
}
