import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { CivilianShipView, GameView } from '../../../../domain/views';
import {
  CIVILIAN_HALF_HEIGHT_UNITS,
  CIVILIAN_HALF_WIDTH_UNITS,
  FLEET_LINE_Y_UNITS,
} from '../../../../domain/fleet/integrity';
import { WORLD_WIDTH_UNITS } from '../../../../domain/shared/world';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * The civilian line and placeholder hulls. A dinged hull plus an orange notch is the hit tell, not
 * a flash (PRD 7.4, 15).
 */
export class FleetPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private line: Phaser.GameObjects.Rectangle | null = null;
  private readonly hulls = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly notches = new Map<number, Phaser.GameObjects.Rectangle>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {}

  sync(view: GameView, _alpha: number): void {
    this.ensureLine();
    for (const ship of view.fleet.ships) this.syncShip(ship);
  }

  private ensureLine(): void {
    if (this.line) return;
    this.line = this.scene.add.rectangle(
      WORLD_WIDTH_UNITS / 2,
      FLEET_LINE_Y_UNITS,
      WORLD_WIDTH_UNITS,
      2,
      PALETTE.fleetLine,
      0.5,
    );
  }

  private syncShip(ship: CivilianShipView): void {
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
}
