import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';
import { IMAGINARY_SIX, IMAGINARY_SIX_SHOWN } from '../../sprites';

/**
 * Imaginary Six beside the Viper, from her 32 x 48 file, with a steady thin beam. Her glow is in the
 * picture, still. Never flickers (PRD 10.3, 15). Never Cylon red.
 */
export class ImaginarySixPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private body: Phaser.GameObjects.Image | null = null;
  private beam: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {}

  sync(view: GameView, alpha: number): void {
    const six = view.imaginarySix;
    if (!six || !six.present) {
      this.hide();
      return;
    }

    const x = six.previousX + (six.x - six.previousX) * alpha;
    const y = six.previousY + (six.y - six.previousY) * alpha;
    const body = (this.body ??= this.buildBody());
    body.setVisible(true).setPosition(x, y);

    if (!six.aiming) {
      this.beam?.setVisible(false);
      return;
    }

    const beam = this.beam ?? this.buildBeam();
    const dx = six.beamX - x;
    const dy = six.beamY - y;
    const length = Math.hypot(dx, dy);
    beam.setVisible(true);
    beam.setPosition(x + dx / 2, y + dy / 2);
    beam.setSize(Math.max(1, length), 1);
    beam.setRotation(Math.atan2(dy, dx));
  }

  /** Over her beam, so the beam reads as leaving her. */
  private buildBody(): Phaser.GameObjects.Image {
    return this.scene.add
      .image(0, 0, IMAGINARY_SIX)
      .setDisplaySize(IMAGINARY_SIX_SHOWN.width, IMAGINARY_SIX_SHOWN.height)
      .setDepth(3);
  }

  private buildBeam(): Phaser.GameObjects.Rectangle {
    const beam = this.scene.add.rectangle(0, 0, 1, 1, PALETTE.sixGlow, 0.7);
    beam.setDepth(2);
    this.beam = beam;
    return beam;
  }

  private hide(): void {
    this.body?.setVisible(false);
    this.beam?.setVisible(false);
  }
}
