import type Phaser from 'phaser';
import {
  SIX_HALF_HEIGHT_UNITS,
  SIX_HALF_WIDTH_UNITS,
} from '../../../../domain/combat/imaginarySix';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * Placeholder Imaginary Six: a pale outline beside the Viper and a steady thin beam.
 * Never flickers (PRD 10.3, 15). Real `imaginary_six` art waits. Never Cylon red.
 */
export class ImaginarySixPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private glow: Phaser.GameObjects.Arc | null = null;
  private outline: Phaser.GameObjects.Rectangle | null = null;
  private core: Phaser.GameObjects.Rectangle | null = null;
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
    this.ensureBody();
    this.glow?.setVisible(true).setPosition(x, y);
    this.outline?.setVisible(true).setPosition(x, y);
    this.core?.setVisible(true).setPosition(x, y);

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

  private ensureBody(): void {
    if (this.outline) return;
    this.glow = this.scene.add.circle(0, 0, 10, PALETTE.sixGlow, 0.18);
    this.glow.setDepth(2);
    this.outline = this.scene.add.rectangle(
      0,
      0,
      SIX_HALF_WIDTH_UNITS * 2,
      SIX_HALF_HEIGHT_UNITS * 2,
      PALETTE.sixGlow,
      0,
    );
    this.outline.setStrokeStyle(1, PALETTE.sixGlow, 0.95);
    this.outline.setDepth(3);
    this.core = this.scene.add.rectangle(0, -1, 3, 5, PALETTE.sixGlow, 0.55);
    this.core.setDepth(3);
  }

  private buildBeam(): Phaser.GameObjects.Rectangle {
    const beam = this.scene.add.rectangle(0, 0, 1, 1, PALETTE.sixGlow, 0.7);
    beam.setDepth(2);
    this.beam = beam;
    return beam;
  }

  private hide(): void {
    this.glow?.setVisible(false);
    this.outline?.setVisible(false);
    this.core?.setVisible(false);
    this.beam?.setVisible(false);
  }
}
