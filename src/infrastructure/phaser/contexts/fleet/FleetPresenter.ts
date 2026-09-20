import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import type { GameView } from '../../../../domain/views';
import { FLEET_LINE_Y_UNITS } from '../../../../domain/fleet/integrity';
import { WORLD_WIDTH_UNITS } from '../../../../domain/shared/world';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/**
 * The civilian line. No ships yet: a thin bar so a stray's destination is visible before it lands.
 */
export class FleetPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private line: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {}

  sync(_view: GameView, _alpha: number): void {
    if (this.line) return;
    this.line = this.scene.add.rectangle(
      WORLD_WIDTH_UNITS / 2,
      FLEET_LINE_Y_UNITS,
      WORLD_WIDTH_UNITS,
      2,
      PALETTE.fleetLine,
      0.85,
    );
  }
}
