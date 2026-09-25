import Phaser from 'phaser';
import { debugFacts, type FrameStats } from '../../application/FrameStats';
import type { GameSession } from '../../application/GameSession';
import { WORLD_HEIGHT_UNITS } from '../../domain/shared/world';
import type { Presenter } from './Presenter';
import { ExplosionPresenter } from './contexts/combat/ExplosionPresenter';
import { ImpactPresenter } from './contexts/combat/ImpactPresenter';
import { MissilePresenter } from './contexts/combat/MissilePresenter';
import { ProjectilePresenter } from './contexts/combat/ProjectilePresenter';
import { ImaginarySixPresenter } from './contexts/combat/ImaginarySixPresenter';
import { ViperPresenter } from './contexts/combat/ViperPresenter';
import { StickPresenter, type StickSource } from './contexts/controls/StickPresenter';
import { FleetPresenter } from './contexts/fleet/FleetPresenter';
import { RaptorPresenter } from './contexts/fleet/RaptorPresenter';
import { RaiderPresenter } from './contexts/swarm/RaiderPresenter';
import { ResurrectionShipPresenter } from './contexts/swarm/ResurrectionShipPresenter';
import { LessonFocusPresenter } from './contexts/training/LessonFocusPresenter';
import type { ReducedEffectsSource } from './shared/comfort';
import { PALETTE } from './shared/palette';
import { PIXELS_PER_WORLD_UNIT } from './shared/renderScale';
import { loadSpriteImages } from './sprites';

/** How often the debug readout updates. Often enough to be useful, rarely enough to stay readable. */
const STATS_INTERVAL_SECONDS = 0.25;

/**
 * Phaser smooths and clamps the delta it hands to `update`, so counting frames against that delta
 * reports a comfortable 60 on a browser that is actually running at five. `actualFps` is measured
 * against the real clock, and the phone check depends on this number telling the truth.
 */
function measuredFps(game: Phaser.Game): number {
  return Math.round(game.loop.actualFps);
}

/**
 * The scene shell (ADR-0001 D4): each frame it advances the session, hands the resulting events to
 * every presenter, then lets them sync to read-only state. It knows presenters only through the
 * `Presenter` interface, so adding a bounded context means adding a presenter here.
 */
export class GameScene extends Phaser.Scene {
  private readonly session: GameSession;
  private readonly stick: StickSource;
  private readonly reportStats: (stats: FrameStats) => void;
  private readonly reducedEffects: ReducedEffectsSource;
  private presenters: Presenter[] = [];
  private spritesReady = false;
  private closed = false;

  private secondsSinceStatsReport = 0;

  constructor(
    session: GameSession,
    stick: StickSource,
    reportStats: (stats: FrameStats) => void,
    reducedEffects: ReducedEffectsSource,
  ) {
    super({ key: 'game' });
    this.session = session;
    this.stick = stick;
    this.reportStats = reportStats;
    this.reducedEffects = reducedEffects;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closed = true;
    });
    void this.mount().catch((error: unknown) => {
      console.error(error);
    });
  }

  private async mount(): Promise<void> {
    const images = await loadSpriteImages();
    if (this.closed) return;
    for (const sprite of images) {
      if (!this.textures.exists(sprite.key)) this.textures.addImage(sprite.key, sprite.image);
    }

    // Draw at two art pixels per world unit: the camera zooms from the top-left, so world (0, 0) stays
    // the canvas corner and every presenter keeps using world units (docs/art/ART-SCALE.md).
    this.cameras.main.setBackgroundColor(PALETTE.space).setOrigin(0, 0).setZoom(PIXELS_PER_WORLD_UNIT);
    // A thin frame, so the edges of the play area are visible while there is nothing else on screen.
    const width = this.scale.width / PIXELS_PER_WORLD_UNIT;
    const frame = this.add
      .rectangle(width / 2, WORLD_HEIGHT_UNITS / 2, width - 2, WORLD_HEIGHT_UNITS - 2)
      .setStrokeStyle(1, PALETTE.viperCockpit, 0.25);
    this.scale.on('resize', () => {
      const next = this.scale.width / PIXELS_PER_WORLD_UNIT;
      frame.setPosition(next / 2, WORLD_HEIGHT_UNITS / 2);
      frame.setSize(next - 2, WORLD_HEIGHT_UNITS - 2);
    });

    this.presenters = [
      new FleetPresenter(this, this.reducedEffects),
      new RaptorPresenter(this),
      new ViperPresenter(this, this.reducedEffects),
      new ImaginarySixPresenter(this),
      new ProjectilePresenter(this),
      new MissilePresenter(this, this.reducedEffects),
      new RaiderPresenter(this, this.reducedEffects),
      new ExplosionPresenter(this, this.reducedEffects),
      new ImpactPresenter(this, this.reducedEffects),
      new ResurrectionShipPresenter(this),
      new StickPresenter(this, this.stick, this.reducedEffects),
      new LessonFocusPresenter(this, () => this.session.lessonCard),
    ];
    this.spritesReady = true;
  }

  override update(_time: number, deltaMilliseconds: number): void {
    if (!this.spritesReady) return;
    const deltaSeconds = deltaMilliseconds / 1000;
    const frozen = this.session.isFrozen;

    // Cosmetics follow the game clock, so a pause freezes tweens, animations, and particles
    // (ADR-0001 D7). Rule timing never touches Phaser's clock at all.
    const cosmeticScale = frozen ? 0 : 1;
    this.tweens.timeScale = cosmeticScale;
    this.anims.globalTimeScale = cosmeticScale;

    const frame = this.session.advance(deltaSeconds);

    for (const event of frame.events) {
      for (const presenter of this.presenters) presenter.onEvent(event);
    }

    // While frozen there is no newer tick to interpolate towards, so sit exactly on the last one.
    const alpha = frozen ? 1 : frame.interpolationAlpha;
    for (const presenter of this.presenters) presenter.sync(this.session.view, alpha);

    this.publishStats(deltaSeconds);
  }

  /** The debug readout only. The HUD is fed by the session, not by the renderer (ADR-0002 D2). */
  private publishStats(deltaSeconds: number): void {
    this.secondsSinceStatsReport += deltaSeconds;
    if (this.secondsSinceStatsReport < STATS_INTERVAL_SECONDS) return;

    const canvas = this.game.canvas;
    const view = this.session.view;
    this.reportStats({
      fps: measuredFps(this.game),
      frozen: this.session.isFrozen,
      renderWidth: view.worldWidth,
      renderHeight: WORLD_HEIGHT_UNITS,
      scale: Math.round((canvas.clientWidth / view.worldWidth) * 10) / 10,
      ...debugFacts(view),
    });

    this.secondsSinceStatsReport = 0;
  }
}
