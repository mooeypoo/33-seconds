import { CIVILIAN_HALF_HEIGHT_UNITS, FLEET_LINE_Y_UNITS } from '../../domain/fleet/integrity';
import { VIPER_HALF_HEIGHT_UNITS, VIPER_HALF_WIDTH_UNITS } from '../../domain/combat/viper';
import { HEAVY_RADIUS_UNITS, RAIDER_HALF_HEIGHT_UNITS, RAIDER_HALF_WIDTH_UNITS } from '../../domain/swarm/raider';
import { GHOST_RADIUS_UNITS } from '../../domain/swarm/resurrection';
import { RESURRECTION_SHIP_HALF_WIDTH_UNITS } from '../../domain/swarm/resurrectionShip';
import type { GameView } from '../../domain/views';
import type { LessonFocus } from './trainingScript';

/**
 * The one thing in the playfield a lesson is about (PRD 5.5): the round, the Raider, the Viper, the
 * resurrection ship, or the spot where a drone died. The card keeps clear of it, and the `subject`
 * focus rings it.
 */
export type LessonSubject =
  | { readonly kind: 'shot'; readonly id: number }
  | { readonly kind: 'raider'; readonly id: number }
  | { readonly kind: 'viper' }
  | { readonly kind: 'ship' }
  | { readonly kind: 'point'; readonly x: number; readonly y: number };

/**
 * A box around something the card should not cover, in world units. `priority` 0 is the subject,
 * which matters most; 1 is the rest (the fleet row).
 */
export interface FocusBox {
  readonly x: number;
  readonly y: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly priority: 0 | 1;
}

/** A round is 3×7 art pixels, drawn at 3×7 world units. */
const SHOT_HALF_WIDTH_UNITS = 2;
const SHOT_HALF_HEIGHT_UNITS = 4;
/** The eject chute drifts about 10 units sideways and 6 down from where the Viper was. */
const EJECT_DRIFT_UNITS = 10;
/** The ship's shield bubble reaches past the drawn hull. */
const SHIP_HALF_HEIGHT_UNITS = 16;
/** Just the hulls and the line, with a little room. */
const FLEET_ROW_ROOM_UNITS = 4;
/** Galactica's nose rises this far above the line (docs/art/SPRITE-FILES.md), so the row box covers it. */
const GALACTICA_NOSE_ABOVE_LINE_UNITS = 20;
const FLEET_ROW_TOP_UNITS = FLEET_LINE_Y_UNITS - GALACTICA_NOSE_ABOVE_LINE_UNITS - FLEET_ROW_ROOM_UNITS;
const FLEET_ROW_BOTTOM_UNITS = FLEET_LINE_Y_UNITS + CIVILIAN_HALF_HEIGHT_UNITS + FLEET_ROW_ROOM_UNITS;

/** Where the subject is now, or null when it is gone (a round that landed, a Raider shot down). */
export function subjectBox(subject: LessonSubject, view: GameView): FocusBox | null {
  const scale = view.fighterScale;
  switch (subject.kind) {
    case 'shot': {
      const shot = view.projectiles.find((candidate) => candidate.id === subject.id);
      return shot ? box(shot.x, shot.y, SHOT_HALF_WIDTH_UNITS, SHOT_HALF_HEIGHT_UNITS) : null;
    }
    case 'raider': {
      const raider = view.raiders.find((candidate) => candidate.id === subject.id);
      if (!raider) return null;
      if (raider.kind === 'heavy') return box(raider.x, raider.y, HEAVY_RADIUS_UNITS * scale, HEAVY_RADIUS_UNITS * scale);
      return box(raider.x, raider.y, RAIDER_HALF_WIDTH_UNITS * scale, RAIDER_HALF_HEIGHT_UNITS * scale);
    }
    case 'viper': {
      const { viper } = view;
      const halfWidth = VIPER_HALF_WIDTH_UNITS * viper.scale * scale;
      const halfHeight = VIPER_HALF_HEIGHT_UNITS * viper.scale * scale;
      if (!viper.ejected) return box(viper.x, viper.y, halfWidth, halfHeight);
      // The pilot drifts off under a chute: cover where it has been and where it is going.
      return box(viper.x, viper.y + EJECT_DRIFT_UNITS / 2, halfWidth + EJECT_DRIFT_UNITS, halfHeight + EJECT_DRIFT_UNITS);
    }
    case 'ship': {
      const ship = view.resurrectionShip;
      return ship ? box(ship.x, ship.y, RESURRECTION_SHIP_HALF_WIDTH_UNITS, SHIP_HALF_HEIGHT_UNITS) : null;
    }
    case 'point':
      return box(subject.x, subject.y, GHOST_RADIUS_UNITS, GHOST_RADIUS_UNITS);
  }
}

/**
 * Everything in the playfield the card should keep clear of: the subject, whether or not it is
 * ringed, and the fleet row when the lesson outlines it.
 */
export function lessonFocusBoxes(
  lesson: { readonly focus: readonly LessonFocus[]; readonly subject: LessonSubject | null },
  view: GameView,
): FocusBox[] {
  const boxes: FocusBox[] = [];
  const subject = lesson.subject ? subjectBox(lesson.subject, view) : null;
  if (subject) boxes.push(subject);
  if (lesson.focus.includes('fleetLine')) {
    boxes.push({
      x: view.worldWidth / 2,
      y: (FLEET_ROW_TOP_UNITS + FLEET_ROW_BOTTOM_UNITS) / 2,
      halfWidth: view.worldWidth / 2,
      halfHeight: (FLEET_ROW_BOTTOM_UNITS - FLEET_ROW_TOP_UNITS) / 2,
      priority: 1,
    });
  }
  return boxes;
}

function box(x: number, y: number, halfWidth: number, halfHeight: number): FocusBox {
  return { x, y, halfWidth, halfHeight, priority: 0 };
}
