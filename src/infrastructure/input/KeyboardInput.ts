import type { InputPort } from '../../application/ports/InputPort';
import type { InputIntent } from '../../domain/shared/intent';

/**
 * Keyed by `event.code`, which is physical position, so WASD works on AZERTY and Dvorak too
 * (PRD 13.1). Listeners live on `window` rather than the game root, because a div does not receive
 * key events without a tabindex and because we need window-level blur to clear held keys.
 */
const LEFT_CODES = ['KeyA', 'ArrowLeft'];
const RIGHT_CODES = ['KeyD', 'ArrowRight'];
const UP_CODES = ['KeyW', 'ArrowUp'];
const DOWN_CODES = ['KeyS', 'ArrowDown'];
const MISSILE_CODES = ['Space'];
const SPECIAL_CODES = ['KeyE'];
const PAUSE_CODES = ['Escape', 'KeyP'];

/** Keys the browser would otherwise scroll the page with. */
const SWALLOWED_CODES = new Set([...UP_CODES, ...DOWN_CODES, ...LEFT_CODES, ...RIGHT_CODES, ...MISSILE_CODES]);

export interface KeyboardInputOptions {
  /** Called when the player asks for the pause menu. Pause is a session command, not an intent. */
  readonly onPauseRequested: () => void;
}

export class KeyboardInput implements InputPort {
  private readonly held = new Set<string>();
  private readonly options: KeyboardInputOptions;
  private disposers: (() => void)[] = [];

  constructor(options: KeyboardInputOptions) {
    this.options = options;
  }

  attach(): void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (SWALLOWED_CODES.has(event.code)) event.preventDefault();
      if (PAUSE_CODES.includes(event.code)) {
        event.preventDefault();
        this.options.onPauseRequested();
        return;
      }
      this.held.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.held.delete(event.code);
    };
    // A key held while the window loses focus would otherwise stay held forever.
    const onBlur = (): void => {
      this.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    this.disposers = [
      () => {
        window.removeEventListener('keydown', onKeyDown);
      },
      () => {
        window.removeEventListener('keyup', onKeyUp);
      },
      () => {
        window.removeEventListener('blur', onBlur);
      },
    ];
  }

  detach(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.clear();
  }

  readIntent(): InputIntent {
    const left = this.isAnyHeld(LEFT_CODES) ? 1 : 0;
    const right = this.isAnyHeld(RIGHT_CODES) ? 1 : 0;
    const up = this.isAnyHeld(UP_CODES) ? 1 : 0;
    const down = this.isAnyHeld(DOWN_CODES) ? 1 : 0;

    return {
      moveX: right - left,
      moveY: down - up,
      missile: this.isAnyHeld(MISSILE_CODES),
      special: this.isAnyHeld(SPECIAL_CODES),
    };
  }

  clear(): void {
    this.held.clear();
  }

  private isAnyHeld(codes: readonly string[]): boolean {
    return codes.some((code) => this.held.has(code));
  }
}
