import Phaser from 'phaser';
import {
  VIPER_SHOT_HEIGHT_UNITS,
  VIPER_SHOT_WIDTH_UNITS,
} from '../../../../domain/combat/projectile';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView, ProjectileView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * Draws shots. Player rounds are Dradis green. Cylon rounds are red while Aimed and longer orange
 * once they become Stray, so colour is never the only cue (PRD 7.1, 15).
 */
export class ProjectilePresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<number, Phaser.GameObjects.Rectangle>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'ShotFired') return;
    this.ensure(event.id, event.x, event.y, event.owner === 'cylon', false);
  }

  sync(view: GameView, alpha: number): void {
    const seen = new Set<number>();

    for (const shot of view.projectiles) {
      seen.add(shot.id);
      const sprite = this.ensure(shot.id, shot.x, shot.y, shot.owner === 'cylon', shot.stray);
      sprite.x = Phaser.Math.Linear(shot.previousX, shot.x, alpha);
      sprite.y = Phaser.Math.Linear(shot.previousY, shot.y, alpha);
      this.paint(sprite, shot);
    }

    for (const [id, sprite] of this.sprites) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }
  }

  private ensure(
    id: number,
    x: number,
    y: number,
    cylon: boolean,
    stray: boolean,
  ): Phaser.GameObjects.Rectangle {
    const existing = this.sprites.get(id);
    if (existing) return existing;

    const height = cylon && stray ? VIPER_SHOT_HEIGHT_UNITS + 2 : VIPER_SHOT_HEIGHT_UNITS;
    const color = cylon ? (stray ? PALETTE.strayShot : PALETTE.aimedShot) : PALETTE.playerShot;
    const sprite = this.scene.add.rectangle(x, y, VIPER_SHOT_WIDTH_UNITS, height, color);
    sprite.setDepth(1);
    this.sprites.set(id, sprite);
    return sprite;
  }

  private paint(sprite: Phaser.GameObjects.Rectangle, shot: ProjectileView): void {
    if (shot.owner !== 'cylon') return;
    sprite.setFillStyle(shot.stray ? PALETTE.strayShot : PALETTE.aimedShot);
    sprite.setDisplaySize(VIPER_SHOT_WIDTH_UNITS, shot.stray ? VIPER_SHOT_HEIGHT_UNITS + 2 : VIPER_SHOT_HEIGHT_UNITS);
  }
}
