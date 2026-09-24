import Phaser from 'phaser';
import {
  MISSILE_HEIGHT_UNITS,
  MISSILE_WIDTH_UNITS,
} from '../../../../domain/combat/missile';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import type { ReducedEffectsSource } from '../../shared/comfort';
import { PALETTE } from '../../shared/palette';
import { MISSILE_ANIM, MISSILE_FRAME_RATE, MISSILE_FRAMES } from '../../sprites';

/**
 * Ring radius. The crossarms stick out a little so it reads as a lock, not a halo.
 * Small and half transparent so the mark does not cover the ship it is pointing at.
 */
const RETICLE_RADIUS = 5;
const RETICLE_ARM = 7;
const RETICLE_LINE = 1;
const RETICLE_ALPHA = 0.5;

/**
 * Draws missiles and the lock reticle. Colour is never the only cue: ring plus a four-quadrant
 * cross. Missiles stay upright, like the shots: rotating a picture this small smears it. The
 * flame flickers between two frames; reduced effects holds the first.
 */
export class MissilePresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: ReducedEffectsSource;
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly reticle: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.reduced = reduced;
    if (!scene.anims.exists(MISSILE_ANIM)) {
      scene.anims.create({
        key: MISSILE_ANIM,
        frames: MISSILE_FRAMES.map((key) => ({ key })),
        frameRate: MISSILE_FRAME_RATE,
        repeat: -1,
      });
    }
    const ring = scene.add.circle(0, 0, RETICLE_RADIUS, PALETTE.missileLock, 0);
    ring.setStrokeStyle(RETICLE_LINE, PALETTE.missileLock, RETICLE_ALPHA);
    const horizontal = scene.add.rectangle(0, 0, RETICLE_ARM * 2, RETICLE_LINE, PALETTE.missileLock, RETICLE_ALPHA);
    const vertical = scene.add.rectangle(0, 0, RETICLE_LINE, RETICLE_ARM * 2, PALETTE.missileLock, RETICLE_ALPHA);
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

  private ensure(id: number, x: number, y: number): Phaser.GameObjects.Sprite {
    const existing = this.sprites.get(id);
    if (existing) return existing;
    const sprite = this.scene.add.sprite(x, y, MISSILE_FRAMES[0]);
    sprite.setDisplaySize(MISSILE_WIDTH_UNITS, MISSILE_HEIGHT_UNITS);
    sprite.setDepth(2);
    if (!this.reduced()) sprite.play(MISSILE_ANIM);
    this.sprites.set(id, sprite);
    return sprite;
  }
}
