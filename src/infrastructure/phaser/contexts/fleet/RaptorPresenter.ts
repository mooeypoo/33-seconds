import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView, RaptorView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';
import { RAPTOR, RAPTOR_SHOWN } from '../../sprites';

/**
 * The Raptor escort on the fleet line, from its 32 x 16 file. Pips for hull above it, like the
 * Viper's and the Raiders', and clear of the civilians below; the picture is not the health readout. Gone when hangared. Olive, never Cylon red (PRD 9).
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
    const body = this.scene.add.image(0, 0, RAPTOR).setDisplaySize(RAPTOR_SHOWN.width, RAPTOR_SHOWN.height);
    const pips: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < raptor.hpMax; i++) {
      pips.push(this.scene.add.rectangle((i - (raptor.hpMax - 1) / 2) * 4, -RAPTOR_SHOWN.height / 2 - 3, 3, 2, PALETTE.civilianHull));
    }
    const root = this.scene.add.container(raptor.x, raptor.y, [body, ...pips]);
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
