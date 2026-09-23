import type Phaser from 'phaser';
import type { DomainEvent } from '../../../../domain/shared/events';
import { FLEET_LINE_Y_UNITS } from '../../../../domain/fleet/integrity';
import { WORLD_WIDTH_UNITS } from '../../../../domain/shared/world';
import type { CycleView, GameView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';

const NUMBER_COLOR = '#1c8459';
const SPOOL_COLOR = '#ffc457';

/**
 * The 33, painted in the playfield just above the fleet (PRD 5.1). Depth stays behind every
 * ship and shot, so the picture reads as part of the background and the Viper can fly over it.
 * Colour is not the only spool cue: the caption says Spooling too.
 */
export class ClockPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private seconds: Phaser.GameObjects.Text | null = null;
  private caption: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  onEvent(_event: DomainEvent): void {
    // The clock follows read-only cycle state. It has no event of its own.
  }

  sync(view: GameView, _alpha: number): void {
    this.ensure();
    const cycle = view.cycle;
    this.seconds?.setText(String(cycle.secondsRemaining));
    this.seconds?.setColor(cycle.phase === 'spooling' ? SPOOL_COLOR : NUMBER_COLOR);
    this.caption?.setText(captionFor(cycle));
  }

  private ensure(): void {
    if (this.seconds) return;
    const x = WORLD_WIDTH_UNITS / 2;
    // Sit fully above the hulls. An 84px glyph centered any lower is clipped by the world edge.
    const numberY = FLEET_LINE_Y_UNITS - 72;
    this.caption = this.scene.add
      .text(x, numberY - 52, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '16px',
        color: '#8a9b58',
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(-20)
      .setAlpha(0.85);
    this.seconds = this.scene.add
      .text(x, numberY, '', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '84px',
        color: NUMBER_COLOR,
        align: 'center',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(-20)
      .setAlpha(0.55);
  }
}

function captionFor(cycle: CycleView): string {
  if (cycle.phase === 'spooling') return 'Spooling';
  if (cycle.phase === 'jumping') return 'Jumping';
  if (cycle.phase === 'recovering') return 'Recovering';
  return `Cycle ${String(cycle.cycleIndex)}`;
}
