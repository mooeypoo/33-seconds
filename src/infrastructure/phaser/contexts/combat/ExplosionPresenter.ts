import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import type { ReducedEffectsSource } from '../../shared/comfort';
import { EXPLOSION_ANIM, EXPLOSION_FRAME_RATE, EXPLOSION_FRAMES, SHIP_SHOWN_UNITS } from '../../sprites';

/** A heavy Raider's burst, matching the size it is drawn at until `explosion_large` exists. */
const HEAVY_BURST_SCALE = 1.5;

/** Reduced effects holds the widest cell instead of stepping through the burst. */
const STILL_MS = 280;

/**
 * The small burst when a Raider is destroyed. Six frames, then gone. Pause freezes the playback
 * because it rides Phaser's animation clock, which the scene shell stops (ADR-0001 D7).
 */
export class ExplosionPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: ReducedEffectsSource;
  private fighterScale = 1;

  constructor(scene: Phaser.Scene, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.reduced = reduced;
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
    // A heavy Raider goes up bigger, in step with how it is drawn (ADR-0002 3.3).
    const shown = SHIP_SHOWN_UNITS * this.fighterScale * (event.heavy ? HEAVY_BURST_SCALE : 1);
    sprite.setDisplaySize(shown, shown);
    sprite.setDepth(4);

    if (this.reduced()) {
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

  sync(view: GameView, _alpha: number): void {
    // The burst is an event. The scale is remembered so the next one matches this run's fighters.
    this.fighterScale = view.fighterScale;
  }
}
