import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import {
  VIPER_HALF_HEIGHT_UNITS,
  VIPER_HALF_WIDTH_UNITS,
  VIPER_HULL_HIT_POINTS,
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
  private pips: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'ViperSpawned' || event.type === 'ViperRecovered') {
      this.hull?.destroy();
      this.hull = this.buildViper(event.x, event.y);
      return;
    }
    if (event.type === 'ViperEjected') {
      this.hull?.setVisible(false);
    }
  }

  sync(view: GameView, alpha: number): void {
    const hull = this.hull;
    if (!hull) return;

    const { viper } = view;
    hull.setVisible(!viper.ejected);
    if (viper.ejected) return;
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

    this.drawPips(viper.hp);
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

    // Count of pips is the hull tell. Not red: only Cylons are (PRD 9). The debug line also names
    // the number, so colour is never the only cue.
    const pips: Phaser.GameObjects.Rectangle[] = [];
    const pipSpacing = 3;
    const pipOrigin = ((VIPER_HULL_HIT_POINTS - 1) * pipSpacing) / 2;
    for (let i = 0; i < VIPER_HULL_HIT_POINTS; i++) {
      pips.push(this.scene.add.rectangle(i * pipSpacing - pipOrigin, -height / 2 - 6, 2, 2, PALETTE.playerShot));
    }
    this.pips = pips;

    return this.scene.add.container(x, y, [engine, body, nose, cockpit, ...pips]);
  }

  private drawPips(hp: number): void {
    for (const [index, pip] of this.pips.entries()) {
      pip.setVisible(index < hp);
    }
  }
}
