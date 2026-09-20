import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import {
  VIPER_HALF_HEIGHT_UNITS,
  VIPER_HALF_WIDTH_UNITS,
  VIPER_MAX_SPEED_UNITS_PER_SECOND,
} from '../../../../domain/combat/viper';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * Draws the Viper. Placeholder art: a flat hull with a cockpit and an engine glow, sized in world
 * units so swapping in a sprite later changes nothing else (AGENTS.md: placeholders are fine).
 */
export class ViperPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private hull: Phaser.GameObjects.Container | null = null;
  private engine: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'ViperSpawned') return;
    this.hull?.destroy();
    this.hull = this.buildViper(event.x, event.y);
  }

  sync(view: GameView, alpha: number): void {
    const hull = this.hull;
    if (!hull) return;

    const { viper } = view;
    // Interpolate between the last two ticks, so a 120 Hz screen shows smooth motion (ADR-0001 D2).
    hull.x = Phaser.Math.Linear(viper.previousX, viper.x, alpha);
    hull.y = Phaser.Math.Linear(viper.previousY, viper.y, alpha);

    // The Viper banks rather than rotating (PRD decision 13). A horizontal squeeze reads as a bank
    // at this size and costs nothing; the real sprite will have bank frames.
    const bank = Phaser.Math.Clamp(viper.velocityX / VIPER_MAX_SPEED_UNITS_PER_SECOND, -1, 1);
    hull.scaleX = 1 - Math.abs(bank) * 0.3;

    // Engine glow leans the other way and stretches with forward speed. Steady, never flickering
    // (PRD 15: no rapid flashing).
    if (this.engine) {
      const thrust = Phaser.Math.Clamp(-viper.velocityY / VIPER_MAX_SPEED_UNITS_PER_SECOND, 0, 1);
      this.engine.scaleY = 1 + thrust * 0.8;
      this.engine.x = bank * 1.5;
    }
  }

  private buildViper(x: number, y: number): Phaser.GameObjects.Container {
    const width = VIPER_HALF_WIDTH_UNITS * 2;
    const height = VIPER_HALF_HEIGHT_UNITS * 2;

    const body = this.scene.add.rectangle(0, 0, width, height, PALETTE.viperHull);
    const nose = this.scene.add.rectangle(0, -height / 2 - 2, 4, 4, PALETTE.viperHull);
    const cockpit = this.scene.add.rectangle(0, -2, 4, 5, PALETTE.viperCockpit);
    const engine = this.scene.add.rectangle(0, height / 2 + 2, 6, 3, PALETTE.engineGlow);
    engine.setOrigin(0.5, 0);
    this.engine = engine;

    return this.scene.add.container(x, y, [engine, body, nose, cockpit]);
  }
}
