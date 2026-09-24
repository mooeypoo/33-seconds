import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import type { ReducedEffectsSource } from '../../shared/comfort';
import {
  EXPLOSION_ANIM,
  EXPLOSION_FRAME_RATE,
  EXPLOSION_FRAMES,
  EXPLOSION_LARGE_ANIM,
  EXPLOSION_LARGE_FRAMES,
  EXPLOSION_LARGE_SHOWN_UNITS,
  EXPLOSION_LARGE_STILL,
  SHIP_SHOWN_UNITS,
} from '../../sprites';

/** Reduced effects holds the widest cell instead of stepping through the burst. */
const STILL_MS = 280;

interface Burst {
  anim: string;
  still: string;
  shownUnits: number;
}

/**
 * The burst when a Raider or the resurrection ship is destroyed: the small one for a Raider, the
 * large one for a heavy Raider and the ship. Then gone. Pause freezes the playback because it
 * rides Phaser's animation clock, which the scene shell stops (ADR-0001 D7).
 */
export class ExplosionPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: ReducedEffectsSource;
  private fighterScale = 1;

  constructor(scene: Phaser.Scene, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.reduced = reduced;
    this.define(EXPLOSION_ANIM, EXPLOSION_FRAMES);
    this.define(EXPLOSION_LARGE_ANIM, EXPLOSION_LARGE_FRAMES);
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'RaiderDestroyed') {
      // A heavy Raider goes up bigger, in step with how it is drawn (ADR-0002 3.3).
      const burst: Burst = event.heavy
        ? { anim: EXPLOSION_LARGE_ANIM, still: EXPLOSION_LARGE_STILL, shownUnits: EXPLOSION_LARGE_SHOWN_UNITS }
        : { anim: EXPLOSION_ANIM, still: EXPLOSION_FRAMES[2], shownUnits: SHIP_SHOWN_UNITS };
      this.play(event.x, event.y, burst, this.fighterScale);
      return;
    }
    if (event.type === 'ResurrectionShipDestroyed') {
      // The ship is not a fighter, so it does not grow with the desktop fighter scale.
      this.play(
        event.x,
        event.y,
        { anim: EXPLOSION_LARGE_ANIM, still: EXPLOSION_LARGE_STILL, shownUnits: EXPLOSION_LARGE_SHOWN_UNITS },
        1,
      );
    }
  }

  sync(view: GameView, _alpha: number): void {
    // The burst is an event. The scale is remembered so the next one matches this run's fighters.
    this.fighterScale = view.fighterScale;
  }

  private define(key: string, frames: readonly string[]): void {
    if (this.scene.anims.exists(key)) return;
    this.scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: frame })),
      frameRate: EXPLOSION_FRAME_RATE,
      repeat: 0,
    });
  }

  private play(x: number, y: number, burst: Burst, scale: number): void {
    const sprite = this.scene.add.sprite(x, y, burst.still);
    const shown = burst.shownUnits * scale;
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

    sprite.play(burst.anim);
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
    });
  }
}
