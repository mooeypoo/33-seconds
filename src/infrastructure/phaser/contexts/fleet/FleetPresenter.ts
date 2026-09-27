import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { CivilianShipView, GameView } from '../../../../domain/views';
import { FLEET_LINE_Y_UNITS } from '../../../../domain/fleet/integrity';
import type { Presenter } from '../../Presenter';
import type { ReducedEffectsSource } from '../../shared/comfort';
import { PALETTE } from '../../shared/palette';
import {
  CIVILIAN_SHOWN,
  CIVILIAN_VARIANTS,
  GALACTICA,
  GALACTICA_DAMAGED,
  GALACTICA_LINE_FROM_BOTTOM_UNITS,
  GALACTICA_SHOWN,
} from '../../sprites';

/**
 * Under the Raiders (depth -1), so a strafer diving at the line is never hidden behind the nose.
 * The line runs behind Galactica.
 */
const LINE_DEPTH = -3;
const GALACTICA_DEPTH = -2;

/** One-beat puff. Pause freezes it. Not a flash (PRD 15). */
const FLAK_FADE_MS = 140;

/**
 * The civilian line: drawn ships, and Galactica's nose rising out of the bottom edge. A dented picture
 * plus an orange notch is the hit tell, not a flash (PRD 7.4, 15). *Flak Enthusiast* adds a still puff where a stray died and a muzzle on
 * Galactica, so the intercept is a shape, not only a colour.
 *
 * ASSUMPTION: the line is still rigid. A later pass can give hulls a slight up/down and a little
 * sideways idle, like the resurrection ship's station-keeping, without leaving the bottom edge.
 */
export class FleetPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly reduced: ReducedEffectsSource;
  private line: Phaser.GameObjects.Rectangle | null = null;
  private readonly hulls = new Map<number, Phaser.GameObjects.Image>();
  private readonly notches = new Map<number, Phaser.GameObjects.Rectangle>();
  /** Read from the view's `galactica` flag, not a copied index. */
  private galacticaId: number | null = null;

  constructor(scene: Phaser.Scene, reduced: ReducedEffectsSource) {
    this.scene = scene;
    this.reduced = reduced;
  }

  private get fadeMs(): number {
    return this.reduced() ? 0 : FLAK_FADE_MS;
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
      this.line = this.scene.add
        .rectangle(worldWidth / 2, FLEET_LINE_Y_UNITS, worldWidth, 2, PALETTE.fleetLine, 0.5)
        .setDepth(LINE_DEPTH);
    }
    this.line.setPosition(worldWidth / 2, FLEET_LINE_Y_UNITS);
    this.line.setSize(worldWidth, 2);
  }

  private syncShip(ship: CivilianShipView): void {
    if (ship.galactica) this.galacticaId = ship.id;
    let hull = this.hulls.get(ship.id);
    if (!hull) {
      hull = ship.galactica ? this.addGalactica(ship) : this.addCivilian(ship);
      this.hulls.set(ship.id, hull);
    }
    const key = textureFor(ship);
    if (hull.texture.key !== key) hull.setTexture(key);

    let notch = this.notches.get(ship.id);
    if (!notch) {
      notch = this.scene.add.rectangle(ship.x, notchY(ship), 4, 2, PALETTE.strayShot);
      this.notches.set(ship.id, notch);
    }
    notch.setVisible(ship.justHit);
  }

  private addCivilian(ship: CivilianShipView): Phaser.GameObjects.Image {
    return this.scene.add.image(ship.x, ship.y, textureFor(ship)).setDisplaySize(CIVILIAN_SHOWN.width, CIVILIAN_SHOWN.height);
  }

  /** Anchored by its bottom, so the line crosses the drawn hull where the art expects it. */
  private addGalactica(ship: CivilianShipView): Phaser.GameObjects.Image {
    return this.scene.add
      .image(ship.x, ship.y + GALACTICA_LINE_FROM_BOTTOM_UNITS, textureFor(ship))
      .setOrigin(0.5, 1)
      .setDisplaySize(GALACTICA_SHOWN.width, GALACTICA_SHOWN.height)
      .setDepth(GALACTICA_DEPTH);
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
    const muzzle = this.scene.add.rectangle(hull.x, hull.y - GALACTICA_SHOWN.height - 2, 3, 5, PALETTE.strayShot);
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

function textureFor(ship: CivilianShipView): string {
  if (ship.galactica) return ship.healthy ? GALACTICA : GALACTICA_DAMAGED;
  const variant = variantFor(ship.id);
  return ship.healthy ? variant.healthy : variant.damaged;
}

/** Just above the hull's top edge: the nose tip for Galactica. */
function notchY(ship: CivilianShipView): number {
  const aboveLine = ship.galactica ? GALACTICA_SHOWN.height - GALACTICA_LINE_FROM_BOTTOM_UNITS : CIVILIAN_SHOWN.height / 2;
  return ship.y - aboveLine - 2;
}

/** Neighbours differ, and a ship keeps its design all run. Cosmetic, so no random stream. */
function variantFor(shipId: number): (typeof CIVILIAN_VARIANTS)[number] {
  return CIVILIAN_VARIANTS[shipId % CIVILIAN_VARIANTS.length] ?? CIVILIAN_VARIANTS[0];
}
