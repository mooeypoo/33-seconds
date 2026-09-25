import type Phaser from 'phaser';
import type { LessonCard } from '../../../../application/training/LessonDirector';
import { lessonFocusBoxes, subjectBox } from '../../../../application/training/lessonFocus';
import type { GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** Reads the lesson on screen, or null. */
export type LessonCardSource = () => LessonCard | null;

/** Wide enough to read at phone size, matching the HUD outline's 3 px at 2 px per world unit. */
const STROKE_UNITS = 1.5;
/** Room between the thing and its outline, so the outline never hides it. */
const MARGIN_UNITS = 3;
/** Above every sprite, so nothing covers the outline. */
const DEPTH = 10;

/**
 * The playfield half of a Training Run lesson's outlines (PRD 5.5): the fleet row, and a ring on
 * the lesson's subject. The HUD half is CSS. Where things are comes from `lessonFocus`, which also
 * places the card, so the ring and the gap the card leaves always agree. Still amber lines only,
 * drawn only while a lesson is up, so there is nothing to reduce for comfort (PRD 15), and the
 * lesson says in words what the outline marks, so colour is never the only cue.
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
      const row = lessonFocusBoxes({ focus: ['fleetLine'], subject: null }, view)[0];
      if (row) graphics.strokeRect(2, row.y - row.halfHeight, view.worldWidth - 4, row.halfHeight * 2);
    }

    // Gone already (a round that landed, a Raider shot down): the words still carry the lesson.
    const subject = card.focus.includes('subject') && card.subject ? subjectBox(card.subject, view) : null;
    if (subject) graphics.strokeCircle(subject.x, subject.y, Math.max(subject.halfWidth, subject.halfHeight) + MARGIN_UNITS);
  }
}
