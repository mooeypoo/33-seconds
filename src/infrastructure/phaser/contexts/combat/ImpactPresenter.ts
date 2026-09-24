import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import type { ReducedEffectsSource } from '../../shared/comfort';
import { PALETTE } from '../../shared/palette';

/** How long a spark lives, and how far it travels. A beat, not a flash (PRD 15). */
const SPARK_MS = 200;
const SPARK_TRAVEL_UNITS = 6;
/** Big enough to register at a glance on a phone; still a few pixels, never a burst. */
const SPARK_SIZE_UNITS = 3;
const SPLASH_MS = 220;

/** Four fixed directions, so the effect is the same every time and uses no randomness. */
const SPARK_DIRECTIONS: readonly (readonly [number, number])[] = [
  [-0.7, -0.7],
  [0.7, -0.7],
  [-0.9, 0.3],
  [0.9, 0.3],
];

/**
 * What a hit that does not kill looks like (ADR-0002 3.4): a few warm sparks where the round struck,
 * and a ripple on the resurrection ship's shield when it takes the round instead. Nothing flashes and
 * the camera never moves (PRD 15). With reduced effects, a single still spark marks the hit and fades.
 * Tweens follow the game clock, so a pause freezes them mid-air (ADR-0001 D7).
 */
export class ImpactPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: ReducedEffectsSource;

  constructor(scene: Phaser.Scene, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.reduced = reduced;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'RaiderHit' || event.type === 'ViperHit') {
      this.sparks(event.x, event.y);
      return;
    }
    if (event.type === 'ResurrectionShipHit') {
      if (event.shielded) this.splash(event.x, event.y);
      else this.sparks(event.x, event.y);
    }
  }

  sync(_view: GameView, _alpha: number): void {
    // Every effect here is started by an event and ends on its own.
  }

  private sparks(x: number, y: number): void {
    if (this.reduced()) {
      const still = this.scene.add.rectangle(x, y, SPARK_SIZE_UNITS, SPARK_SIZE_UNITS, PALETTE.engineGlow).setDepth(5);
      this.fadeAndDrop(still, 0, 0);
      return;
    }
    for (const [dx, dy] of SPARK_DIRECTIONS) {
      const spark = this.scene.add.rectangle(x, y, SPARK_SIZE_UNITS, SPARK_SIZE_UNITS, dy < 0 ? PALETTE.engineGlow : PALETTE.strayShot).setDepth(5);
      this.fadeAndDrop(spark, dx * SPARK_TRAVEL_UNITS, dy * SPARK_TRAVEL_UNITS);
    }
  }

  /** The bubble took the round: a ring that widens and fades, in the shield's own colour. */
  private splash(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 3, PALETTE.shipShield, 0).setDepth(5);
    ring.setStrokeStyle(1, PALETTE.shipShield, 0.8);
    if (this.reduced()) {
      this.fadeAndDrop(ring, 0, 0);
      return;
    }
    this.scene.tweens.add({
      targets: ring,
      scale: 2.5,
      alpha: 0,
      duration: SPLASH_MS,
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  private fadeAndDrop(target: Phaser.GameObjects.Shape, dx: number, dy: number): void {
    this.scene.tweens.add({
      targets: target,
      x: target.x + dx,
      y: target.y + dy,
      alpha: 0,
      duration: SPARK_MS,
      onComplete: () => {
        target.destroy();
      },
    });
  }
}
