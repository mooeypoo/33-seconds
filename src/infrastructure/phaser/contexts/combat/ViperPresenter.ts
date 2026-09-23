import Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import { VIPER_HULL_HIT_POINTS, VIPER_MAX_SPEED_UNITS_PER_SECOND } from '../../../../domain/combat/viper';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';
import { SHIP_SHOWN_UNITS, VIPER_BANK_LEFT, VIPER_BANK_RIGHT, VIPER_FLICKER, VIPER_NEUTRAL } from '../../sprites';

/** Sideways speed, as a fraction of top speed, before the bank frame replaces neutral. */
const BANK_AT = 0.4;

/**
 * Draws the Viper from the 64×64 frames, shown at 16 world units. Hull pips stay, because the
 * picture is not the health readout (PRD 8.1).
 */
export class ViperPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private hull: Phaser.GameObjects.Container | null = null;
  private body: Phaser.GameObjects.Image | null = null;
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

    // Bank frames replace the squeeze. The brighter engines are the thrust pose, held while
    // climbing, so the picture does not blink (PRD 15).
    const bank = viper.velocityX / VIPER_MAX_SPEED_UNITS_PER_SECOND;
    const frame = frameFor(bank, viper.velocityY < 0);
    this.showFrame(frame, viper.scale);

    this.drawPips(viper.hp);
    this.cover?.setVisible(view.speechActive);
    this.eye?.setVisible(viper.cylonEye);
  }

  private showFrame(key: string, scale: number): void {
    const body = this.body;
    if (!body) return;
    if (body.texture.key !== key) body.setTexture(key);
    body.setDisplaySize(SHIP_SHOWN_UNITS * scale, SHIP_SHOWN_UNITS * scale);
  }

  private buildViper(x: number, y: number): Phaser.GameObjects.Container {
    const body = this.scene.add.image(0, 0, VIPER_NEUTRAL);
    body.setDisplaySize(SHIP_SHOWN_UNITS, SHIP_SHOWN_UNITS);
    this.body = body;

    // Count of pips is the hull tell. Not red: only Cylons are (PRD 9). The debug line also names
    // the number, so colour is never the only cue.
    const pips: Phaser.GameObjects.Rectangle[] = [];
    const pipSpacing = 3;
    const pipOrigin = ((VIPER_HULL_HIT_POINTS - 1) * pipSpacing) / 2;
    for (let i = 0; i < VIPER_HULL_HIT_POINTS; i++) {
      pips.push(this.scene.add.rectangle(i * pipSpacing - pipOrigin, -SHIP_SHOWN_UNITS / 2 - 4, 2, 2, PALETTE.playerShot));
    }
    this.pips = pips;

    const cover = this.scene.add.circle(0, 0, SHIP_SHOWN_UNITS / 2 + 3, PALETTE.viperCockpit, 0);
    cover.setStrokeStyle(1, PALETTE.viperCockpit, 0.9);
    cover.setVisible(false);
    this.cover = cover;

    // Card cosmetic: a still red-eye pixel. HUD also says "two transponders" (PRD 9, 10.2).
    const eye = this.scene.add.rectangle(1, -2, 2, 2, PALETTE.aimedShot);
    eye.setVisible(false);
    this.eye = eye;

    return this.scene.add.container(x, y, [body, cover, eye, ...pips]);
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

function frameFor(bank: number, climbing: boolean): string {
  if (bank > BANK_AT) return VIPER_BANK_RIGHT;
  if (bank < -BANK_AT) return VIPER_BANK_LEFT;
  if (climbing) return VIPER_FLICKER;
  return VIPER_NEUTRAL;
}
