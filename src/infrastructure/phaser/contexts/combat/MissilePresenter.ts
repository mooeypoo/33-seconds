import Phaser from 'phaser';
import {
  MISSILE_HEIGHT_UNITS,
  MISSILE_WIDTH_UNITS,
} from '../../../../domain/combat/missile';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** Ring radius. The crossarms stick out a little so it reads as a lock, not a halo. */
const RETICLE_RADIUS = 8;
const RETICLE_ARM = 11;
const RETICLE_LINE = 1;

/** Draws missiles and the lock reticle. Colour is never the only cue: ring plus a four-quadrant cross. */
export class MissilePresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly reticle: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const ring = scene.add.circle(0, 0, RETICLE_RADIUS, PALETTE.missileLock, 0);
    ring.setStrokeStyle(RETICLE_LINE, PALETTE.missileLock, 0.95);
    const horizontal = scene.add.rectangle(0, 0, RETICLE_ARM * 2, RETICLE_LINE, PALETTE.missileLock, 0.95);
    const vertical = scene.add.rectangle(0, 0, RETICLE_LINE, RETICLE_ARM * 2, PALETTE.missileLock, 0.95);
    this.reticle = scene.add.container(0, 0, [ring, horizontal, vertical]);
    this.reticle.setDepth(3);
    this.reticle.setVisible(false);
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'MissileFired') return;
    this.ensure(event.id, event.x, event.y);
  }

  sync(view: GameView, alpha: number): void {
    const seen = new Set<number>();
    for (const missile of view.missiles) {
      seen.add(missile.id);
      const sprite = this.ensure(missile.id, missile.x, missile.y);
      sprite.x = Phaser.Math.Linear(missile.previousX, missile.x, alpha);
      sprite.y = Phaser.Math.Linear(missile.previousY, missile.y, alpha);
    }
    for (const [id, sprite] of this.sprites) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.sprites.delete(id);
    }

    const lock = view.missileLock;
    if (!lock) {
      this.reticle.setVisible(false);
      return;
    }
    this.reticle.setVisible(true);
    this.reticle.x = Phaser.Math.Linear(lock.previousX, lock.x, alpha);
    this.reticle.y = Phaser.Math.Linear(lock.previousY, lock.y, alpha);
  }

  private ensure(id: number, x: number, y: number): Phaser.GameObjects.Rectangle {
    const existing = this.sprites.get(id);
    if (existing) return existing;
    const sprite = this.scene.add.rectangle(x, y, MISSILE_WIDTH_UNITS, MISSILE_HEIGHT_UNITS, PALETTE.missile);
    sprite.setDepth(2);
    this.sprites.set(id, sprite);
    return sprite;
  }
}
