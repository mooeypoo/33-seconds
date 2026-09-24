import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { CivilianShipView, GameView } from '../../../../domain/views';
import {
  CIVILIAN_HALF_HEIGHT_UNITS,
  CIVILIAN_HALF_WIDTH_UNITS,
  FLEET_LINE_Y_UNITS,
} from '../../../../domain/fleet/integrity';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** One-beat puff. Pause freezes it. Not a flash (PRD 15). */
const FLAK_FADE_MS = 140;

/**
 * The civilian line and placeholder hulls. A dinged hull plus an orange notch is the hit tell, not
 * a flash (PRD 7.4, 15). *Flak Enthusiast* adds a still puff where a stray died and a muzzle on
 * Galactica, so the intercept is a shape, not only a colour.
 *
 * ASSUMPTION: the line is still rigid. A later pass can give hulls a slight up/down and a little
 * sideways idle, like the resurrection ship's station-keeping, without leaving the bottom edge.
 */
export class FleetPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly fadeMs: number;
  private line: Phaser.GameObjects.Rectangle | null = null;
  private readonly hulls = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly notches = new Map<number, Phaser.GameObjects.Rectangle>();
  /** Read from the view's `galactica` flag, not a copied index. */
  private galacticaId: number | null = null;

  constructor(scene: Phaser.Scene, prefersReducedMotion: boolean) {
    this.scene = scene;
    this.fadeMs = prefersReducedMotion ? 0 : FLAK_FADE_MS;
  }

  onEvent(event: DomainEvent): void {
    if (event.type !== 'FlakIntercepted') return;
    this.spawnBurst(event.x, event.y);
    this.flashGalactica();
  }

  sync(view: GameView, _alpha: number): void {
    this.ensureLine(view.worldWidth);
    for (const ship of view.fleet.ships) this.syncShip(ship);
  }

  private ensureLine(worldWidth: number): void {
    if (!this.line) {
      this.line = this.scene.add.rectangle(worldWidth / 2, FLEET_LINE_Y_UNITS, worldWidth, 2, PALETTE.fleetLine, 0.5);
    }
    this.line.setPosition(worldWidth / 2, FLEET_LINE_Y_UNITS);
    this.line.setSize(worldWidth, 2);
  }

  private syncShip(ship: CivilianShipView): void {
    if (ship.galactica) this.galacticaId = ship.id;
    let hull = this.hulls.get(ship.id);
    const width = CIVILIAN_HALF_WIDTH_UNITS * 2 * (ship.galactica ? 1.4 : 1);
    const height = CIVILIAN_HALF_HEIGHT_UNITS * 2;
    if (!hull) {
      hull = this.scene.add.rectangle(ship.x, ship.y, width, height, PALETTE.civilianHull);
      this.hulls.set(ship.id, hull);
    }
    hull.setFillStyle(ship.healthy ? PALETTE.civilianHull : PALETTE.civilianDinged);

    let notch = this.notches.get(ship.id);
    if (!notch) {
      notch = this.scene.add.rectangle(ship.x, ship.y - height / 2 - 2, 4, 2, PALETTE.strayShot);
      this.notches.set(ship.id, notch);
    }
    notch.setVisible(ship.justHit);
  }

  /** Three still puffs at the stray, olive and orange. Shape is the cue, not only colour. */
  private spawnBurst(x: number, y: number): void {
    const puffs = [
      this.scene.add.rectangle(x, y - 3, 5, 5, PALETTE.civilianHull),
      this.scene.add.rectangle(x - 4, y + 1, 3, 3, PALETTE.strayShot),
      this.scene.add.rectangle(x + 4, y + 1, 3, 3, PALETTE.strayShot),
    ];
    for (const puff of puffs) this.fadeOut(puff);
  }

  private flashGalactica(): void {
    if (this.galacticaId === null) return;
    const hull = this.hulls.get(this.galacticaId);
    if (!hull) return;
    const muzzle = this.scene.add.rectangle(hull.x, hull.y - 7, 3, 5, PALETTE.strayShot);
    this.fadeOut(muzzle);
  }

  private fadeOut(target: Phaser.GameObjects.Rectangle): void {
    this.scene.tweens.add({
      targets: target,
      alpha: 0,
      duration: this.fadeMs,
      onComplete: () => {
        target.destroy();
      },
    });
  }
}
