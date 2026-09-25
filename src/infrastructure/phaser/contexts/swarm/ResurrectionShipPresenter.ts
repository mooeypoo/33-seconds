import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView, ResurrectionShipView } from '../../../../domain/views';
import {
  RESURRECTION_SHIP_HULL_HALF_LENGTH_UNITS,
  RESURRECTION_SHIP_HULL_RADIUS_UNITS,
} from '../../../../domain/swarm/resurrectionShip';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';
import {
  RESURRECTION_SHIP_OPEN,
  RESURRECTION_SHIP_SEALED,
  RESURRECTION_SHIP_SHOWN,
  RESURRECTION_SHIP_WRECK,
} from '../../sprites';

/** The hull bar sits just above the tallest spines of the drawn hull. */
const BAR_OFFSET_Y_UNITS = -10;

/**
 * The bubble hugs the long hull, just outside where a round is stopped, so the ripple shows on the
 * bubble. The picture's top and bottom are empty space.
 */
const SHIELD_PAD_X_UNITS = 3;
const SHIELD_PAD_Y_UNITS = 4;

/**
 * The resurrection ship, high on the right. A still glass bubble means the shield is up (PRD 5.2).
 * The picture is the bay state: doors shut, doors apart over the glowing well, or the dead wreck.
 * Each is a different shape, and the HUD says `sealed`, `bays`, or `offline`, so colour is never
 * the only cue. The swap is a cut every 4 s, well under any flashing limit. Panic and FTL wait.
 */
export class ResurrectionShipPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private hull: Phaser.GameObjects.Container | null = null;
  private body: Phaser.GameObjects.Sprite | null = null;
  private bar: Phaser.GameObjects.Rectangle | null = null;
  private track: Phaser.GameObjects.Rectangle | null = null;
  private shield: Phaser.GameObjects.Ellipse | null = null;

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
    if (this.bar) {
      this.bar.scaleX = ship.hpMax > 0 ? ship.hp / ship.hpMax : 0;
      this.bar.setVisible(!ship.destroyed && !ship.shielded);
    }
    this.track?.setVisible(!ship.destroyed);
    this.shield?.setVisible(ship.shielded);
    this.syncPicture(ship);
  }

  /** Shielded counts as sealed: the doors stay shut under the bubble (ART-DIRECTION 13). */
  private syncPicture(ship: ResurrectionShipView): void {
    if (!this.body) return;
    const key = ship.destroyed
      ? RESURRECTION_SHIP_WRECK
      : ship.baysOpen && !ship.shielded
        ? RESURRECTION_SHIP_OPEN
        : RESURRECTION_SHIP_SEALED;
    if (this.body.texture.key === key) return;
    this.body.setTexture(key);
    this.body.setDisplaySize(RESURRECTION_SHIP_SHOWN.width, RESURRECTION_SHIP_SHOWN.height);
  }

  private build(x: number, y: number): Phaser.GameObjects.Container {
    const width = RESURRECTION_SHIP_SHOWN.width;
    const body = this.scene.add.sprite(0, 0, RESURRECTION_SHIP_SEALED);
    body.setDisplaySize(width, RESURRECTION_SHIP_SHOWN.height);
    this.body = body;
    const track = this.scene.add.rectangle(0, BAR_OFFSET_Y_UNITS, width, 2, PALETTE.ghostBlip, 0.25);
    this.track = track;
    const bar = this.scene.add.rectangle(-width / 2, BAR_OFFSET_Y_UNITS, width, 2, PALETTE.cylonRed);
    bar.setOrigin(0, 0.5);
    this.bar = bar;
    const shieldWidth = (RESURRECTION_SHIP_HULL_HALF_LENGTH_UNITS + RESURRECTION_SHIP_HULL_RADIUS_UNITS + SHIELD_PAD_X_UNITS) * 2;
    const shieldHeight = (RESURRECTION_SHIP_HULL_RADIUS_UNITS + SHIELD_PAD_Y_UNITS) * 2;
    const shield = this.scene.add.ellipse(0, 0, shieldWidth, shieldHeight, PALETTE.shipShield, 0.12);
    shield.setStrokeStyle(1, PALETTE.shipShield, 0.9);
    this.shield = shield;
    return this.scene.add.container(x, y, [body, shield, track, bar]);
  }

  private forget(): void {
    this.hull?.destroy();
    this.hull = null;
    this.body = null;
    this.bar = null;
    this.track = null;
    this.shield = null;
  }
}
