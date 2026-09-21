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
  private cover: Phaser.GameObjects.Arc | null = null;
  private eye: Phaser.GameObjects.Rectangle | null = null;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  /** Placeholder ejection seat. Not a child of the hull, or hiding the Viper would hide it too. */
  private ejectSeat: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'ViperSpawned' || event.type === 'ViperRecovered') {
      this.hull?.destroy();
      this.ejectSeat?.destroy();
      this.ejectSeat = null;
      this.hull = this.buildViper(event.x, event.y);
      return;
    }
    if (event.type === 'ViperEjected') {
      this.hull?.setVisible(false);
    }
    if (event.type === 'ViperDownloaded') {
      this.hull?.setVisible(true);
    }
  }

  sync(view: GameView, alpha: number): void {
    const hull = this.hull;
    if (!hull) return;

    const { viper } = view;
    const x = Phaser.Math.Linear(viper.previousX, viper.x, alpha);
    const y = Phaser.Math.Linear(viper.previousY, viper.y, alpha);

    if (viper.ejected) {
      hull.setVisible(false);
      const seat = this.ensureEjectSeat();
      seat.setVisible(true);
      seat.x = x;
      seat.y = y;
      return;
    }

    this.ejectSeat?.setVisible(false);
    hull.setVisible(true);
    hull.x = x;
    hull.y = y;

    // The Viper banks rather than rotating (PRD decision 13). A horizontal squeeze reads as a bank
    // at this size and costs nothing; the real sprite will have bank frames.
    const bank = Phaser.Math.Clamp(viper.velocityX / VIPER_MAX_SPEED_UNITS_PER_SECOND, -1, 1);
    hull.scaleX = (1 - Math.abs(bank) * 0.3) * viper.scale;
    hull.scaleY = viper.scale;

    // Engine glow leans the other way and stretches with forward speed. Steady, never flickering
    // (PRD 15: no rapid flashing).
    if (this.engine) {
      const thrust = Phaser.Math.Clamp(-viper.velocityY / VIPER_MAX_SPEED_UNITS_PER_SECOND, 0, 1);
      this.engine.scaleY = 1 + thrust * 0.8;
      this.engine.x = bank * 1.5;
    }

    this.drawPips(viper.hp);
    this.cover?.setVisible(view.speechActive);
    this.eye?.setVisible(viper.cylonEye);
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

    const cover = this.scene.add.circle(0, 0, Math.max(width, height) / 2 + 3, PALETTE.viperCockpit, 0);
    cover.setStrokeStyle(1, PALETTE.viperCockpit, 0.9);
    cover.setVisible(false);
    this.cover = cover;

    // Card cosmetic: a still red-eye pixel. HUD also says "two transponders" (PRD 9, 10.2).
    const eye = this.scene.add.rectangle(1, -2, 2, 2, PALETTE.aimedShot);
    eye.setVisible(false);
    this.eye = eye;

    return this.scene.add.container(x, y, [engine, body, nose, cockpit, cover, eye, ...pips]);
  }

  /**
   * Still placeholder seat until `pilot_eject` ships (PRD 8.1, ART-DIRECTION §10). Gunmetal, never
   * Cylon red. HUD also says ejected, so colour is not the only cue.
   */
  private ensureEjectSeat(): Phaser.GameObjects.Container {
    if (this.ejectSeat) return this.ejectSeat;
    const chute = this.scene.add.rectangle(0, -8, 10, 3, PALETTE.viperHull);
    const back = this.scene.add.rectangle(0, -3, 3, 6, PALETTE.viperCockpit);
    const seat = this.scene.add.rectangle(0, 2, 8, 4, PALETTE.viperHull);
    const marker = this.scene.add.container(0, 0, [chute, back, seat]);
    marker.setDepth(3);
    this.ejectSeat = marker;
    return marker;
  }

  private drawPips(hp: number): void {
    for (const [index, pip] of this.pips.entries()) {
      pip.setVisible(index < hp);
    }
  }
}
