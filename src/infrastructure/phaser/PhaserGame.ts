import Phaser from 'phaser';
import type { FrameStats } from '../../application/FrameStats';
import type { GameSession } from '../../application/GameSession';
import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../../domain/shared/world';
import { GameScene } from './GameScene';
import type { StickSource } from './contexts/controls/StickPresenter';
import { PALETTE } from './shared/palette';

/**
 * The only composition root for Phaser (ADR-0001 D4). Phaser is imported nowhere else, which the
 * dependency-boundary check enforces.
 *
 * @param reportStats called a few times a second with render statistics for the debug readout
 */
export function bootPhaser(
  parent: HTMLElement,
  session: GameSession,
  stick: StickSource,
  reportStats: (stats: FrameStats) => void,
): () => void {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH_UNITS,
    height: WORLD_HEIGHT_UNITS,
    backgroundColor: PALETTE.space,
    // Nearest-neighbour upscaling of the low-resolution world (PRD 14, ADR-0001 D4b).
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Whole-pixel canvas sizes, so the pixel grid stays crisp.
      autoRound: true,
    },
    // We own input (ADR-0001 D6): our adapters listen on the game root, not on the canvas, so
    // touches work over any overlay. Phaser's own input plugin would fight them.
    input: {
      keyboard: false,
      mouse: false,
      touch: false,
      gamepad: false,
    },
    // No audio yet; the first user gesture will unlock it when audio arrives (ADR-0001 D12).
    audio: { noAudio: true },
    scene: [new GameScene(session, stick, reportStats)],
  });

  return () => {
    game.destroy(true);
  };
}
