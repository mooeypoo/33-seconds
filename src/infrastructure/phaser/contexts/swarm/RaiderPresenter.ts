import Phaser from 'phaser';
import { RAIDER_HALF_HEIGHT_UNITS, RAIDER_HALF_WIDTH_UNITS, RAIDER_HIT_POINTS } from '../../../../domain/swarm/raider';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView, RaiderView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** One sweep of the eye, in milliseconds. Slow on purpose: it is a tell, not a flash (PRD 15). */
const EYE_SWEEP_MS = 900;

const DESTROY_FADE_MS = 140;

/**
 * Draws the Raider. Placeholder art: an arrowhead hull and a sweeping red eye. The eye is the
 * "this is a Cylon" tell; the hull is not red, because only Cylons are (PRD 9).
 */
export class RaiderPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly fadeMs: number;
  private readonly sweepMs: number;

  private hull: Phaser.GameObjects.Container | null = null;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  private shownId: number | null = null;
  private fade: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, prefersReducedMotion: boolean) {
    this.scene = scene;
    this.fadeMs = prefersReducedMotion ? 0 : DESTROY_FADE_MS;
    this.sweepMs = prefersReducedMotion ? 0 : EYE_SWEEP_MS;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'RaiderSpawned') {
      this.fade?.remove();
      this.hull?.destroy();
      this.hull = this.build(event.x, event.y);
      this.shownId = event.id;
      return;
    }

    if (event.type === 'RaiderDestroyed' && event.id === this.shownId) {
      this.fadeOut();
    }
  }

  sync(view: GameView, alpha: number): void {
    const raider = view.raider;
    const hull = this.hull;
    if (!raider || !hull || raider.id !== this.shownId) return;

    hull.x = Phaser.Math.Linear(raider.previousX, raider.x, alpha);
    hull.y = Phaser.Math.Linear(raider.previousY, raider.y, alpha);
    this.drawPips(raider);
  }

  private build(x: number, y: number): Phaser.GameObjects.Container {
    const width = RAIDER_HALF_WIDTH_UNITS * 2;
    const height = RAIDER_HALF_HEIGHT_UNITS * 2;

    // Pointing down: the fleet is the thing it is flying at.
    const body = this.scene.add.rectangle(0, -1, width, height - 4, PALETTE.raiderHull);
    const nose = this.scene.add.rectangle(0, height / 2 - 1, 6, 5, PALETTE.raiderHull);
    const eye = this.scene.add.rectangle(0, -2, 5, 2, PALETTE.cylonRed);

    const pips: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < RAIDER_HIT_POINTS; i++) {
      const pip = this.scene.add.rectangle((i - 1) * 4, -height / 2 - 3, 3, 2, PALETTE.cylonRed);
      pips.push(pip);
    }
    this.pips = pips;

    if (this.sweepMs > 0) {
      this.scene.tweens.add({
        targets: eye,
        x: { from: -4, to: 4 },
        duration: this.sweepMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    return this.scene.add.container(x, y, [body, nose, eye, ...pips]);
  }

  private drawPips(raider: RaiderView): void {
    for (const [index, pip] of this.pips.entries()) {
      pip.setVisible(index < raider.hp);
    }
  }

  private fadeOut(): void {
    const hull = this.hull;
    if (!hull) return;

    this.fade?.remove();
    if (this.fadeMs === 0) {
      hull.destroy();
      this.hull = null;
      this.shownId = null;
      return;
    }

    this.fade = this.scene.tweens.add({
      targets: hull,
      alpha: 0,
      duration: this.fadeMs,
      onComplete: () => {
        hull.destroy();
        if (this.hull === hull) {
          this.hull = null;
          this.shownId = null;
        }
      },
    });
  }
}
