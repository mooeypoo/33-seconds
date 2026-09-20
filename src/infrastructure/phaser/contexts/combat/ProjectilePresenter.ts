import Phaser from 'phaser';
import {
  VIPER_SHOT_HEIGHT_UNITS,
  VIPER_SHOT_WIDTH_UNITS,
} from '../../../../domain/combat/projectile';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * Draws player shots. Placeholder: a short Dradis-green rectangle. Positions come from the domain;
 * this presenter never decides a hit.
 */
export class ProjectilePresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<number, Phaser.GameObjects.Rectangle>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'ShotFired') return;
    this.ensure(event.id, event.x, event.y);
  }

  sync(view: GameView, alpha: number): void {
    const seen = new Set<number>();

    for (const shot of view.projectiles) {
      seen.add(shot.id);
      const sprite = this.ensure(shot.id, shot.x, shot.y);
      sprite.x = Phaser.Math.Linear(shot.previousX, shot.x, alpha);
      sprite.y = Phaser.Math.Linear(shot.previousY, shot.y, alpha);
    }

    for (const [id, sprite] of this.sprites) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }
  }

  private ensure(id: number, x: number, y: number): Phaser.GameObjects.Rectangle {
    const existing = this.sprites.get(id);
    if (existing) return existing;

    const sprite = this.scene.add.rectangle(x, y, VIPER_SHOT_WIDTH_UNITS, VIPER_SHOT_HEIGHT_UNITS, PALETTE.playerShot);
    sprite.setDepth(1);
    this.sprites.set(id, sprite);
    return sprite;
  }
}
