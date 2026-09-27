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

/** Over the hulls, so the X is never hidden by the ship it marks. */
const MARK_DEPTH = 0.5;

/** The X is seven one-unit steps each way, nearly a civilian's height,, with a half-unit dark rim so it holds up on a grey hull. */
const MARK_STEPS = 7;
const MARK_RIM_UNITS = 0.5;
const MARK_ALPHA = 1;

/** On Galactica the X sits on the nose, above the line, where most of the hull shows. */
const GALACTICA_MARK_ABOVE_LINE_UNITS = 9;

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
  /** A still X on each disabled ship, so the damage reads at a glance, not only from the dented art. */
  private readonly marks = new Map<number, Phaser.GameObjects.Graphics>();
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
    // Placed every frame, not only when made: a new run on a phone can have a wider lane than the
    // title's, and the ships keep their ids from one run to the next.
    hull.setPosition(ship.x, ship.galactica ? ship.y + GALACTICA_LINE_FROM_BOTTOM_UNITS : ship.y);

    let notch = this.notches.get(ship.id);
    if (!notch) {
      notch = this.scene.add.rectangle(ship.x, notchY(ship), 4, 2, PALETTE.strayShot);
      this.notches.set(ship.id, notch);
    }
    notch.setPosition(ship.x, notchY(ship));
    notch.setVisible(ship.justHit);

    let mark = this.marks.get(ship.id);
    if (!mark) {
      mark = this.addMark(ship);
      this.marks.set(ship.id, mark);
    }
    mark.setPosition(ship.x, markY(ship));
    mark.setVisible(!ship.healthy);
  }

  private addMark(ship: CivilianShipView): Phaser.GameObjects.Graphics {
    const mark = this.scene.add.graphics({ x: ship.x, y: markY(ship) }).setDepth(MARK_DEPTH).setAlpha(MARK_ALPHA);
    const half = (MARK_STEPS - 1) / 2;
    const cells: { x: number; y: number }[] = [];
    for (let step = 0; step < MARK_STEPS; step++) {
      cells.push({ x: step - half, y: step - half }, { x: step - half, y: half - step });
    }
    // Rim first, then the rust on top, so the rim only shows around the edges.
    mark.fillStyle(PALETTE.space);
    for (const cell of cells) {
      mark.fillRect(cell.x - 0.5 - MARK_RIM_UNITS, cell.y - 0.5 - MARK_RIM_UNITS, 1 + MARK_RIM_UNITS * 2, 1 + MARK_RIM_UNITS * 2);
    }
    mark.fillStyle(PALETTE.disabledMark);
    for (const cell of cells) mark.fillRect(cell.x - 0.5, cell.y - 0.5, 1, 1);
    return mark;
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
/** Galactica's X sits up on its drawn nose, above the line; a civilian's sits on the hull. */
function markY(ship: CivilianShipView): number {
  return ship.galactica ? ship.y - GALACTICA_MARK_ABOVE_LINE_UNITS : ship.y;
}

function notchY(ship: CivilianShipView): number {
  const aboveLine = ship.galactica ? GALACTICA_SHOWN.height - GALACTICA_LINE_FROM_BOTTOM_UNITS : CIVILIAN_SHOWN.height / 2;
  return ship.y - aboveLine - 2;
}

/** Neighbours differ, and a ship keeps its design all run. Cosmetic, so no random stream. */
function variantFor(shipId: number): (typeof CIVILIAN_VARIANTS)[number] {
  return CIVILIAN_VARIANTS[shipId % CIVILIAN_VARIANTS.length] ?? CIVILIAN_VARIANTS[0];
}
