import Phaser from 'phaser';
import type { FrameStats } from '../../application/FrameStats';
import type { GameSession } from '../../application/GameSession';
import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS } from '../../domain/shared/world';
import type { Presenter } from './Presenter';
import { ProjectilePresenter } from './contexts/combat/ProjectilePresenter';
import { ViperPresenter } from './contexts/combat/ViperPresenter';
import { StickPresenter, type StickSource } from './contexts/controls/StickPresenter';
import { RaiderPresenter } from './contexts/swarm/RaiderPresenter';
import { PALETTE } from './shared/palette';

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
  private presenters: Presenter[] = [];

  private secondsSinceStatsReport = 0;

  constructor(session: GameSession, stick: StickSource, reportStats: (stats: FrameStats) => void) {
    super({ key: 'game' });
    this.session = session;
    this.stick = stick;
    this.reportStats = reportStats;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.space);
    // A thin frame, so the edges of the play area are visible while there is nothing else on screen.
    this.add
      .rectangle(WORLD_WIDTH_UNITS / 2, WORLD_HEIGHT_UNITS / 2, WORLD_WIDTH_UNITS - 2, WORLD_HEIGHT_UNITS - 2)
      .setStrokeStyle(1, PALETTE.viperCockpit, 0.25);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.presenters = [
      new ViperPresenter(this),
      new ProjectilePresenter(this),
      new RaiderPresenter(this, prefersReducedMotion),
      new StickPresenter(this, this.stick, prefersReducedMotion),
    ];
  }

  override update(_time: number, deltaMilliseconds: number): void {
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

    this.publishStats(
      deltaSeconds,
      this.session.view.cycle.phase === 'jumping' || this.session.view.cycle.phase === 'recovering',
    );
  }

  private publishStats(deltaSeconds: number, immediate = false): void {
    this.secondsSinceStatsReport += deltaSeconds;
    if (!immediate && this.secondsSinceStatsReport < STATS_INTERVAL_SECONDS) return;

    const canvas = this.game.canvas;
    const view = this.session.view;
    this.reportStats({
      fps: measuredFps(this.game),
      ticks: view.tickCount,
      renderWidth: WORLD_WIDTH_UNITS,
      renderHeight: WORLD_HEIGHT_UNITS,
      scale: Math.round((canvas.clientWidth / WORLD_WIDTH_UNITS) * 10) / 10,
      viperX: Math.round(view.viper.x),
      viperY: Math.round(view.viper.y),
      raiderY: view.raider ? Math.round(view.raider.y) : null,
      shots: view.projectiles.length,
      kills: view.kills,
      cycleIndex: view.cycle.cycleIndex,
      cyclePhase: view.cycle.phase,
      secondsRemaining: view.cycle.secondsRemaining,
      spoolProgress: view.cycle.spoolProgress,
      hull: view.viper.hp,
      ejected: view.viper.ejected,
    });

    this.secondsSinceStatsReport = 0;
  }
}
