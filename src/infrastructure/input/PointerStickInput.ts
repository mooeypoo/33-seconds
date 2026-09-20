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
const DEAD_ZONE_PX = 5;

/** Drag distance that means full speed. Small enough for one thumb (PRD 13.2). */
const MAX_RADIUS_PX = 46;

export interface StickState {
  readonly active: boolean;
  readonly originX: number;
  readonly originY: number;
  readonly pointerX: number;
  readonly pointerY: number;
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
  private onPointerCancelled: (() => void) | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /**
   * @param onPointerCancelled fired when the browser takes the pointer away (a notification, an
   * edge swipe), which auto-pauses the game (PRD 13.3).
   */
  attach(onPointerCancelled: () => void): void {
    this.onPointerCancelled = onPointerCancelled;

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
      this.onPointerCancelled?.();
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
    this.onPointerCancelled = null;
    this.clear();
  }

  readIntent(): InputIntent {
    const missile = this.missileLatched;
    this.missileLatched = false;

    if (this.stickPointerId === null) {
      return { moveX: 0, moveY: 0, missile, special: false };
    }

    const dragX = this.currentX - this.originX;
    const dragY = this.currentY - this.originY;
    const distance = Math.hypot(dragX, dragY);

    if (distance <= DEAD_ZONE_PX) {
      return { moveX: 0, moveY: 0, missile, special: false };
    }

    // Analog between the dead zone and the max radius, so a small drag is a gentle nudge.
    const strength = Math.min((distance - DEAD_ZONE_PX) / (MAX_RADIUS_PX - DEAD_ZONE_PX), 1);
    return {
      moveX: (dragX / distance) * strength,
      moveY: (dragY / distance) * strength,
      missile,
      special: false,
    };
  }

  get state(): StickState {
    return {
      active: this.stickPointerId !== null,
      originX: this.originX,
      originY: this.originY,
      pointerX: this.currentX,
      pointerY: this.currentY,
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
