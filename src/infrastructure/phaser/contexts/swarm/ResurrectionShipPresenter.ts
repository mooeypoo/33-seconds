import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import {
  RESURRECTION_SHIP_HALF_HEIGHT_UNITS,
  RESURRECTION_SHIP_HALF_WIDTH_UNITS,
} from '../../../../domain/swarm/resurrectionShip';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

const DOOR_CLOSED_GAP = 0;
const DOOR_OPEN_GAP = 5;

/**
 * Placeholder resurrection ship: a chunky hull at the map edge. A still glass bubble means the
 * shield is up (PRD 5.2). Hangar doors split when open and meet when sealed, plus a HUD word, so
 * colour is never the only cue. Panic and FTL spool wait.
 */
export class ResurrectionShipPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private hull: Phaser.GameObjects.Container | null = null;
  private bar: Phaser.GameObjects.Rectangle | null = null;
  private shield: Phaser.GameObjects.Ellipse | null = null;
  private leftDoor: Phaser.GameObjects.Rectangle | null = null;
  private rightDoor: Phaser.GameObjects.Rectangle | null = null;
  private well: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {
    // Sync owns the sprite so a second Launch (title after a win) cannot leave a ghost hull.
  }

  sync(view: GameView, alpha: number): void {
    const ship = view.resurrectionShip;
    if (!ship) {
      this.forget();
      return;
    }

    if (!this.hull) this.hull = this.build(ship.x, ship.y);
    this.hull.x = ship.previousX + (ship.x - ship.previousX) * alpha;
    this.hull.y = ship.previousY + (ship.y - ship.previousY) * alpha;
    this.hull.setAlpha(ship.destroyed ? 0.35 : 1);
    if (this.bar) {
      this.bar.scaleX = ship.hpMax > 0 ? ship.hp / ship.hpMax : 0;
      this.bar.setVisible(!ship.destroyed && !ship.shielded);
    }
    this.shield?.setVisible(ship.shielded);
    this.syncDoors(ship.baysOpen, ship.destroyed || ship.shielded);
  }

  private build(x: number, y: number): Phaser.GameObjects.Container {
    const width = RESURRECTION_SHIP_HALF_WIDTH_UNITS * 2;
    const height = RESURRECTION_SHIP_HALF_HEIGHT_UNITS * 2;
    const body = this.scene.add.rectangle(0, 0, width, height, PALETTE.raiderHull);
    const well = this.scene.add.rectangle(0, 2, width - 8, 6, PALETTE.cylonRed, 0.85);
    const doorWidth = (width - 8) / 2;
    const leftDoor = this.scene.add.rectangle(-doorWidth / 2, 2, doorWidth, 6, PALETTE.ghostBlip);
    const rightDoor = this.scene.add.rectangle(doorWidth / 2, 2, doorWidth, 6, PALETTE.ghostBlip);
    this.well = well;
    this.leftDoor = leftDoor;
    this.rightDoor = rightDoor;
    const track = this.scene.add.rectangle(0, -height / 2 - 4, width, 2, PALETTE.ghostBlip, 0.25);
    const bar = this.scene.add.rectangle(-width / 2, -height / 2 - 4, width, 2, PALETTE.cylonRed);
    bar.setOrigin(0, 0.5);
    this.bar = bar;
    const shield = this.scene.add.ellipse(0, 0, width + 14, height + 14, PALETTE.shipShield, 0.12);
    shield.setStrokeStyle(1, PALETTE.shipShield, 0.9);
    this.shield = shield;
    return this.scene.add.container(x, y, [shield, body, well, leftDoor, rightDoor, track, bar]);
  }

  /**
   * Open: doors split, red well visible. Sealed: doors meet, well hidden. Shape plus HUD word.
   */
  private syncDoors(open: boolean, hidden: boolean): void {
    const gap = open ? DOOR_OPEN_GAP : DOOR_CLOSED_GAP;
    const doorWidth = this.leftDoor?.width ?? 14;
    this.leftDoor?.setX(-doorWidth / 2 - gap);
    this.rightDoor?.setX(doorWidth / 2 + gap);
    this.leftDoor?.setVisible(!hidden);
    this.rightDoor?.setVisible(!hidden);
    this.well?.setVisible(open && !hidden);
  }

  private forget(): void {
    this.hull?.destroy();
    this.hull = null;
    this.bar = null;
    this.shield = null;
    this.leftDoor = null;
    this.rightDoor = null;
    this.well = null;
  }
}
