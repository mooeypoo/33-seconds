import type Phaser from 'phaser';
import type { LessonCard } from '../../../../application/training/LessonDirector';
import { CIVILIAN_HALF_HEIGHT_UNITS, FLEET_LINE_Y_UNITS } from '../../../../domain/fleet/integrity';
import { RAIDER_RADIUS_UNITS } from '../../../../domain/swarm/raider';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** Reads the lesson on screen, or null. */
export type LessonCardSource = () => LessonCard | null;

/** Wide enough to read at phone size, matching the HUD outline's 3 px at 2 px per world unit. */
const STROKE_UNITS = 1.5;
/** Room between the thing and its outline, so the outline never hides it. */
const MARGIN_UNITS = 4;
/** A round is 3×7 art pixels: a ring this size circles it with room to spare. */
const SHOT_RING_UNITS = 7;
/** Above every sprite, so nothing covers the outline. */
const DEPTH = 10;

/**
 * The playfield half of a Training Run lesson's outlines (PRD 5.5): the fleet line, and the round or
 * Raider the lesson is about. The HUD half is CSS. Still amber lines only, drawn only while a lesson
 * is up, so there is nothing to reduce for comfort (PRD 15), and the lesson says in words what the
 * outline marks, so colour is never the only cue.
 */
export class LessonFocusPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly lesson: LessonCardSource;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, lesson: LessonCardSource) {
    this.scene = scene;
    this.lesson = lesson;
  }

  onEvent(): void {
    // Outlines follow the lesson on screen, not domain events.
  }

  sync(view: GameView, _alpha: number): void {
    const graphics = (this.graphics ??= this.scene.add.graphics().setDepth(DEPTH));
    graphics.clear();
    const card = this.lesson();
    if (!card) return;
    graphics.lineStyle(STROKE_UNITS, PALETTE.lessonFocus, 1);

    if (card.focus.includes('fleetLine')) {
      const halfHeight = CIVILIAN_HALF_HEIGHT_UNITS + MARGIN_UNITS;
      graphics.strokeRect(2, FLEET_LINE_Y_UNITS - halfHeight, view.worldWidth - 4, halfHeight * 2);
    }

    const subject = card.subject;
    if (card.focus.includes('subject') && subject) {
      const where =
        subject.kind === 'shot'
          ? view.projectiles.find((shot) => shot.id === subject.id)
          : view.raiders.find((raider) => raider.id === subject.id);
      // Gone already (a round that landed, a Raider shot down): the words still carry the lesson.
      if (!where) return;
      const radius = subject.kind === 'shot' ? SHOT_RING_UNITS : RAIDER_RADIUS_UNITS * view.fighterScale + MARGIN_UNITS;
      graphics.strokeCircle(where.x, where.y, radius);
    }
  }
}
