import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { EXPLOSION_ANIM, EXPLOSION_FRAME_RATE, EXPLOSION_FRAMES, SHIP_SHOWN_UNITS } from '../../sprites';

/** Reduced effects holds the widest cell instead of stepping through the burst. */
const STILL_MS = 280;

/**
 * The small burst when a Raider is destroyed. Six frames, then gone. Pause freezes the playback
 * because it rides Phaser's animation clock, which the scene shell stops (ADR-0001 D7).
 */
export class ExplosionPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: boolean;

  constructor(scene: Phaser.Scene, prefersReducedMotion: boolean) {
    this.scene = scene;
    this.reduced = prefersReducedMotion;
    if (!scene.anims.exists(EXPLOSION_ANIM)) {
      scene.anims.create({
        key: EXPLOSION_ANIM,
        frames: EXPLOSION_FRAMES.map((key) => ({ key })),
        frameRate: EXPLOSION_FRAME_RATE,
        repeat: 0,
      });
    }
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'RaiderDestroyed') return;
    const sprite = this.scene.add.sprite(event.x, event.y, EXPLOSION_FRAMES[2]);
    sprite.setDisplaySize(SHIP_SHOWN_UNITS, SHIP_SHOWN_UNITS);
    sprite.setDepth(4);

    if (this.reduced) {
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        delay: STILL_MS,
        duration: 0,
        onComplete: () => {
          sprite.destroy();
        },
      });
      return;
    }

    sprite.play(EXPLOSION_ANIM);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
    });
  }

  sync(_view: GameView, _alpha: number): void {
    // The burst is an event, not a body the domain keeps around.
  }
}
