import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import {
  RAPTOR_HALF_HEIGHT_UNITS,
  RAPTOR_HALF_WIDTH_UNITS,
  RAPTOR_HIT_POINTS,
} from '../../../../domain/fleet/raptor';
import type { GameView, RaptorView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * Placeholder Raptor: an olive wedge on the fleet line. Pips for hull. Gone when hangared.
 * Real `raptor` art waits (ART-DIRECTION). Never Cylon red (PRD 9).
 */
export class RaptorPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly hulls = new Map<number, { root: Phaser.GameObjects.Container; pips: Phaser.GameObjects.Rectangle[] }>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {}

  sync(view: GameView, alpha: number): void {
    const live = new Set(view.raptors.filter((raptor) => !raptor.hangared).map((raptor) => raptor.id));
    for (const [id, mark] of this.hulls) {
      if (live.has(id)) continue;
      mark.root.destroy();
      this.hulls.delete(id);
    }

    for (const raptor of view.raptors) {
      if (raptor.hangared) continue;
      const mark = this.hulls.get(raptor.id) ?? this.build(raptor);
      mark.root.x = raptor.previousX + (raptor.x - raptor.previousX) * alpha;
      mark.root.y = raptor.previousY + (raptor.y - raptor.previousY) * alpha;
      this.drawPips(mark.pips, raptor.hp);
    }
  }

  private build(raptor: RaptorView): { root: Phaser.GameObjects.Container; pips: Phaser.GameObjects.Rectangle[] } {
    const width = RAPTOR_HALF_WIDTH_UNITS * 2;
    const height = RAPTOR_HALF_HEIGHT_UNITS * 2;
    const body = this.scene.add.rectangle(0, 0, width, height, PALETTE.civilianHull);
    const nose = this.scene.add.rectangle(0, -height / 2 - 1, 4, 3, PALETTE.viperCockpit);
    const pips: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < RAPTOR_HIT_POINTS; i++) {
      pips.push(this.scene.add.rectangle((i - 1) * 4, height / 2 + 3, 3, 2, PALETTE.civilianHull));
    }
    const root = this.scene.add.container(raptor.x, raptor.y, [body, nose, ...pips]);
    root.setDepth(1);
    const mark = { root, pips };
    this.hulls.set(raptor.id, mark);
    return mark;
  }

  private drawPips(pips: readonly Phaser.GameObjects.Rectangle[], hp: number): void {
    for (const [index, pip] of pips.entries()) {
      pip.setVisible(index < hp);
    }
  }
}
