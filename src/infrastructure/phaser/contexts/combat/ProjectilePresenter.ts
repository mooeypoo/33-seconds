import Phaser from 'phaser';
import {
  VIPER_SHOT_HEIGHT_UNITS,
  VIPER_SHOT_WIDTH_UNITS,
} from '../../../../domain/combat/projectile';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView, ProjectileView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { BULLET_AIMED, BULLET_PLAYER, BULLET_PLAYER_BIG, BULLET_PLAYER_BIG_SHOWN, BULLET_STRAY } from '../../sprites';
import { CANNON_RADIUS_PER_STACK } from '../../../../domain/progression/catalog';

/** 6×14 file at two art pixels per unit. Taller than the 3×5 shots, so orange is not the only cue. */
const STRAY_SHOWN_HEIGHT_UNITS = 7;

/**
 * Draws the shot pictures. Player rounds and aimed rounds are 6×10, shown at 3×5. A stray is
 * 6×14, shown at 3×7 (PRD 7.1). Once *Overcompensating Cannon* is taken, player rounds switch to
 * the 10×16 big shot: 5×8 at one stack, growing with each stack after. Player rounds point up.
 * Cylon rounds point down. They stay upright: rotating a picture this small off the pixel grid
 * smears it, and the path still shows where the round goes.
 */
export class ProjectilePresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();

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
      this.paint(sprite, shot, view.playerShotScale);
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
  ): Phaser.GameObjects.Image {
    const existing = this.sprites.get(id);
    if (existing) return existing;

    const key = cylon ? (stray ? BULLET_STRAY : BULLET_AIMED) : BULLET_PLAYER;
    const sprite = this.scene.add.image(x, y, key);
    sprite.setDepth(1);
    this.sprites.set(id, sprite);
    return sprite;
  }

  private paint(sprite: Phaser.GameObjects.Image, shot: ProjectileView, playerScale: number): void {
    if (shot.owner === 'player') {
      if (playerScale > 1) {
        // The big file is drawn at one stack's size; later stacks grow it by the same ratio.
        const growth = playerScale / CANNON_RADIUS_PER_STACK;
        this.show(sprite, BULLET_PLAYER_BIG, BULLET_PLAYER_BIG_SHOWN.width * growth, BULLET_PLAYER_BIG_SHOWN.height * growth);
        return;
      }
      this.show(sprite, BULLET_PLAYER, VIPER_SHOT_WIDTH_UNITS, VIPER_SHOT_HEIGHT_UNITS);
      return;
    }
    if (shot.stray) {
      this.show(sprite, BULLET_STRAY, VIPER_SHOT_WIDTH_UNITS, STRAY_SHOWN_HEIGHT_UNITS);
      return;
    }
    this.show(sprite, BULLET_AIMED, VIPER_SHOT_WIDTH_UNITS, VIPER_SHOT_HEIGHT_UNITS);
  }

  private show(sprite: Phaser.GameObjects.Image, key: string, width: number, height: number): void {
    if (sprite.texture.key !== key) sprite.setTexture(key);
    sprite.setDisplaySize(width, height);
  }
}
