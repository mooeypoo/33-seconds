import type Phaser from 'phaser';
import type { GameView } from '../../../../domain/views';
import { MAX_RADIUS_PX, type StickState } from '../../../input/PointerStickInput';
import type { Presenter } from '../../Presenter';
import { PIXELS_PER_WORLD_UNIT } from '../../shared/renderScale';
import type { ReducedEffectsSource } from '../../shared/comfort';
import { PALETTE } from '../../shared/palette';

/**
 * Draws the drag stick (PRD 13.2): a ring where the touch landed and a dot showing which way the
 * player is pulling and how much of full speed they are asking for. Without it, a phone player
 * cannot tell that touching means flying.
 *
 * It reads the input adapter's state rather than domain state, because where a thumb landed is a
 * fact about the device, not about the world (ADR-0001 D6).
 */
export interface StickSource {
  readonly state: StickState;
}

/** Fade out, in milliseconds. Short: the indicator should feel attached to the finger. */
const FADE_MS = 120;

/**
 * "Faint" still has to be visible. A one-pixel stroke at 0.35 alpha in the muted HUD blue was
 * invisible against the near-black of space: measured on screen, not guessed. Two pixels at 0.55
 * reads as a quiet ring without competing with the ships.
 */
const RING_STROKE_PX = 2;
const RING_ALPHA = 0.55;
const DOT_ALPHA = 0.9;
/** Inside the dead zone the dot is dim and centred, so "not moving yet" looks deliberate. */
const NEUTRAL_DOT_ALPHA = 0.4;
const DOT_RADIUS_PX = 3;

export class StickPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly stick: StickSource;
  private readonly reduced: ReducedEffectsSource;

  private ring: Phaser.GameObjects.Arc | null = null;
  private dot: Phaser.GameObjects.Arc | null = null;
  private fade: Phaser.Tweens.Tween | null = null;
  private wasActive = false;

  /** Cached: reading layout every frame during a drag would force a reflow every frame. */
  private canvasBounds: DOMRect | null = null;

  /**
   * @param reduced drops the fade only. The indicator itself stays, because it is
   * information rather than decoration (PRD 13.2, 15).
   */
  constructor(scene: Phaser.Scene, stick: StickSource, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.stick = stick;
    this.reduced = reduced;

    // The canvas moves and resizes with the window, so the cached rectangle has to follow.
    this.scene.scale.on('resize', () => {
      this.canvasBounds = null;
    });
  }

  private get fadeMs(): number {
    return this.reduced() ? 0 : FADE_MS;
  }

  onEvent(): void {
    // The stick follows the player's finger, not domain events.
  }

  sync(_view: GameView, _alpha: number): void {
    const state = this.stick.state;

    if (state.active !== this.wasActive) {
      if (state.active) this.show();
      else this.fadeOut();
      this.wasActive = state.active;
    }

    if (!state.active) return;

    const bounds = this.canvasRect();
    const ring = this.ring;
    const dot = this.dot;
    if (!bounds || !ring || !dot) return;

    const pixelsPerUnit = bounds.width / (this.scene.scale.width / PIXELS_PER_WORLD_UNIT);
    ring.setPosition((state.originX - bounds.left) / pixelsPerUnit, (state.originY - bounds.top) / pixelsPerUnit);
    ring.setRadius(MAX_RADIUS_PX / pixelsPerUnit);

    // The dot stops at the ring, so pulling past full speed does not run off the edge: the ring is
    // a promise that this is as fast as it gets.
    const dragX = state.pointerX - state.originX;
    const dragY = state.pointerY - state.originY;
    const dragDistance = Math.hypot(dragX, dragY);
    const shown = Math.min(dragDistance, MAX_RADIUS_PX) / pixelsPerUnit;
    const offsetX = dragDistance > 0 ? (dragX / dragDistance) * shown : 0;
    const offsetY = dragDistance > 0 ? (dragY / dragDistance) * shown : 0;

    const idle = state.strength === 0;
    dot.setPosition(ring.x + (idle ? 0 : offsetX), ring.y + (idle ? 0 : offsetY));
    dot.setFillStyle(idle ? PALETTE.viperCockpit : PALETTE.engineGlow, idle ? NEUTRAL_DOT_ALPHA : DOT_ALPHA);
  }

  private show(): void {
    this.ring ??= this.scene.add
      .circle(0, 0, MAX_RADIUS_PX)
      .setStrokeStyle(RING_STROKE_PX, PALETTE.viperCockpit, RING_ALPHA)
      // Behind the ships: a control hint must never hide a Raider.
      .setDepth(-1);
    this.dot ??= this.scene.add.circle(0, 0, DOT_RADIUS_PX, PALETTE.engineGlow, DOT_ALPHA).setDepth(-1);

    this.fade?.remove();
    this.fade = null;
    this.ring.setAlpha(1);
    this.dot.setAlpha(1);
  }

  private fadeOut(): void {
    const targets = [this.ring, this.dot].filter((target) => target !== null);
    if (targets.length === 0) return;

    this.fade?.remove();
    if (this.fadeMs === 0) {
      for (const target of targets) target.setAlpha(0);
      return;
    }

    // A tween, so the fade follows the game clock and a pause freezes it (ADR-0001 D7).
    this.fade = this.scene.tweens.add({ targets, alpha: 0, duration: this.fadeMs });
  }

  private canvasRect(): DOMRect | null {
    this.canvasBounds ??= this.scene.game.canvas.getBoundingClientRect();
    return this.canvasBounds.width > 0 ? this.canvasBounds : null;
  }
}
