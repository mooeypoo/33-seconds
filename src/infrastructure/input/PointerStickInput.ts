import type { InputPort } from '../../application/ports/InputPort';
import type { InputIntent } from '../../domain/shared/intent';

/**
 * The floating drag stick (PRD 13.2). The first pointer that lands anywhere in the play area sets
 * an origin, and dragging from it steers analog. Listeners sit on the game root in the capture
 * phase, so a HUD or comms overlay above the canvas cannot swallow the touch (ADR-0001 D6).
 *
 * A pointer that starts on a real control (`[data-ui]`) is left alone: that is a button press.
 * A second pointer is a missile, edge-triggered.
 */

/** Movement below this many CSS pixels is treated as a hold, not a nudge. */
export const DEAD_ZONE_PX = 5;

/** Drag distance that means full speed. Small enough for one thumb (PRD 13.2). */
export const MAX_RADIUS_PX = 46;

/** Where the stick is and how hard it is being pulled. Read by the on-screen indicator. */
export interface StickState {
  readonly active: boolean;
  readonly originX: number;
  readonly originY: number;
  readonly pointerX: number;
  readonly pointerY: number;
  /** 0..1 of full speed. Zero inside the dead zone. */
  readonly strength: number;
}

const IDLE_STICK: StickState = {
  active: false,
  originX: 0,
  originY: 0,
  pointerX: 0,
  pointerY: 0,
  strength: 0,
};

/**
 * Turns a drag in CSS pixels into a direction and a strength: nothing inside the dead zone, then
 * analog up to the maximum radius, and full speed beyond it. Pure, so it is tested directly.
 */
export function stickVector(dragX: number, dragY: number): { x: number; y: number; strength: number } {
  const distance = Math.hypot(dragX, dragY);
  if (distance <= DEAD_ZONE_PX) return { x: 0, y: 0, strength: 0 };

  const strength = Math.min((distance - DEAD_ZONE_PX) / (MAX_RADIUS_PX - DEAD_ZONE_PX), 1);
  return { x: (dragX / distance) * strength, y: (dragY / distance) * strength, strength };
}

export interface PointerStickOptions {
  /**
   * Fired when the browser takes the pointer away (a notification, an edge swipe), which
   * auto-pauses the game (PRD 13.3).
   */
  readonly onPointerCancelled: () => void;

  /** Fired on the first drag, which is what dismisses the "drag anywhere to fly" hint. */
  readonly onStickEngaged: () => void;
}

export class PointerStickInput implements InputPort {
  private readonly root: HTMLElement;

  private stickPointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private currentX = 0;
  private currentY = 0;
  private missileLatched = false;

  private disposers: (() => void)[] = [];
  private options: PointerStickOptions | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  attach(options: PointerStickOptions): void {
    this.options = options;

    const onPointerDown = (event: PointerEvent): void => {
      if (isRealControl(event.target)) return;

      if (this.stickPointerId === null) {
        this.stickPointerId = event.pointerId;
        this.originX = event.clientX;
        this.originY = event.clientY;
        this.currentX = event.clientX;
        this.currentY = event.clientY;
        // Keeps the drag ours even if the finger slides over an overlay or off the element.
        this.root.setPointerCapture(event.pointerId);
        this.options?.onStickEngaged();
      } else {
        this.missileLatched = true;
      }
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== this.stickPointerId) return;
      this.currentX = event.clientX;
      this.currentY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== this.stickPointerId) return;
      this.releaseStick();
    };

    const onPointerCancel = (event: PointerEvent): void => {
      if (event.pointerId !== this.stickPointerId) return;
      this.releaseStick();
      this.options?.onPointerCancelled();
    };

    // Capture phase, so nothing above the root can stop these from arriving.
    const capture = { capture: true } as const;
    this.root.addEventListener('pointerdown', onPointerDown, capture);
    this.root.addEventListener('pointermove', onPointerMove, capture);
    this.root.addEventListener('pointerup', onPointerUp, capture);
    this.root.addEventListener('pointercancel', onPointerCancel, capture);

    this.disposers = [
      () => {
        this.root.removeEventListener('pointerdown', onPointerDown, capture);
      },
      () => {
        this.root.removeEventListener('pointermove', onPointerMove, capture);
      },
      () => {
        this.root.removeEventListener('pointerup', onPointerUp, capture);
      },
      () => {
        this.root.removeEventListener('pointercancel', onPointerCancel, capture);
      },
    ];
  }

  detach(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.options = null;
    this.clear();
  }

  readIntent(): InputIntent {
    const missile = this.missileLatched;
    this.missileLatched = false;

    if (this.stickPointerId === null) {
      return { moveX: 0, moveY: 0, missile, special: false };
    }

    const drag = stickVector(this.currentX - this.originX, this.currentY - this.originY);
    return { moveX: drag.x, moveY: drag.y, missile, special: false };
  }

  get state(): StickState {
    if (this.stickPointerId === null) return IDLE_STICK;

    return {
      active: true,
      originX: this.originX,
      originY: this.originY,
      pointerX: this.currentX,
      pointerY: this.currentY,
      strength: stickVector(this.currentX - this.originX, this.currentY - this.originY).strength,
    };
  }

  clear(): void {
    this.releaseStick();
    this.missileLatched = false;
  }

  private releaseStick(): void {
    if (this.stickPointerId !== null && this.root.hasPointerCapture(this.stickPointerId)) {
      this.root.releasePointerCapture(this.stickPointerId);
    }
    this.stickPointerId = null;
  }
}

function isRealControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-ui]') !== null;
}
