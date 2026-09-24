import Phaser from 'phaser';
import type { FrameStats } from '../../application/FrameStats';
import type { GameSession } from '../../application/GameSession';
import { VIPER_HULL_HIT_POINTS } from '../../domain/combat/viper';
import { WORLD_HEIGHT_UNITS } from '../../domain/shared/world';
import type { Presenter } from './Presenter';
import { ExplosionPresenter } from './contexts/combat/ExplosionPresenter';
import { MissilePresenter } from './contexts/combat/MissilePresenter';
import { ProjectilePresenter } from './contexts/combat/ProjectilePresenter';
import { ImaginarySixPresenter } from './contexts/combat/ImaginarySixPresenter';
import { ViperPresenter } from './contexts/combat/ViperPresenter';
import { StickPresenter, type StickSource } from './contexts/controls/StickPresenter';
import { ClockPresenter } from './contexts/cycle/ClockPresenter';
import { FleetPresenter } from './contexts/fleet/FleetPresenter';
import { RaptorPresenter } from './contexts/fleet/RaptorPresenter';
import { RaiderPresenter } from './contexts/swarm/RaiderPresenter';
import { ResurrectionShipPresenter } from './contexts/swarm/ResurrectionShipPresenter';
import { PALETTE } from './shared/palette';
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
  private readonly reducedEffects: boolean;
  private presenters: Presenter[] = [];
  private spritesReady = false;
  private closed = false;

  private secondsSinceStatsReport = 0;

  constructor(
    session: GameSession,
    stick: StickSource,
    reportStats: (stats: FrameStats) => void,
    reducedEffects: boolean,
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

    this.cameras.main.setBackgroundColor(PALETTE.space);
    // A thin frame, so the edges of the play area are visible while there is nothing else on screen.
    const width = this.scale.width;
    const frame = this.add
      .rectangle(width / 2, WORLD_HEIGHT_UNITS / 2, width - 2, WORLD_HEIGHT_UNITS - 2)
      .setStrokeStyle(1, PALETTE.viperCockpit, 0.25);
    this.scale.on('resize', () => {
      const next = this.scale.width;
      frame.setPosition(next / 2, WORLD_HEIGHT_UNITS / 2);
      frame.setSize(next - 2, WORLD_HEIGHT_UNITS - 2);
    });

    this.presenters = [
      new ClockPresenter(this),
      new FleetPresenter(this, this.reducedEffects),
      new RaptorPresenter(this),
      new ViperPresenter(this, this.reducedEffects),
      new ImaginarySixPresenter(this),
      new ProjectilePresenter(this),
      new MissilePresenter(this),
      new RaiderPresenter(this, this.reducedEffects),
      new ExplosionPresenter(this, this.reducedEffects),
      new ResurrectionShipPresenter(this),
      new StickPresenter(this, this.stick, this.reducedEffects),
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
      renderWidth: view.worldWidth,
      renderHeight: WORLD_HEIGHT_UNITS,
      scale: Math.round((canvas.clientWidth / view.worldWidth) * 10) / 10,
      viperX: Math.round(view.viper.x),
      viperY: Math.round(view.viper.y),
      raiderY: view.raiders[0] ? Math.round(view.raiders[0].y) : null,
      shots: view.projectiles.length,
      kills: view.kills,
      cycleIndex: view.cycle.cycleIndex,
      cyclePhase: view.cycle.phase,
      secondsRemaining: view.cycle.secondsRemaining,
      spoolProgress: view.cycle.spoolProgress,
      hull: view.viper.hp,
      hullMax: VIPER_HULL_HIT_POINTS,
      ejected: view.viper.ejected,
      ghosts: view.ghosts.length,
      returned: view.raiders.some((raider) => raider.returned),
      raiderLive: view.raiders.length > 0,
      raiders: view.raiders.length,
      fleet: Math.round(view.fleet.integrity),
      fleetMax: view.fleet.integrityMax,
      shipHp: view.resurrectionShip === null ? null : Math.round(view.resurrectionShip.hp),
      shipHpMax: view.resurrectionShip?.hpMax ?? null,
      shipDestroyed: view.resurrectionShip?.destroyed ?? false,
      shipShielded: view.resurrectionShip?.shielded ?? false,
      shipBaysOpen: view.resurrectionShip?.baysOpen ?? false,
      resurrectionsActive: view.resurrectionsActive,
      missiles: view.missileAmmo,
      missilesMax: view.missileAmmoMax,
      speechActive: view.speechActive,
      speechReady: view.speechReady,
      speechRemainingSeconds: view.speechRemainingSeconds,
      speechJumpsUntilReady: view.speechJumpsUntilReady,
      cards: view.loadout.reduce((sum, card) => sum + card.stacks, 0),
      latestUpgradeId: view.upgradeOrder.at(-1) ?? null,
      olderUpgradeCount: view.upgradeOrder.length > 0 ? view.upgradeOrder.length - 1 : 0,
      cylonEye: view.viper.cylonEye,
      raptorHp: view.raptors.reduce((sum, raptor) => sum + (raptor.hangared ? 0 : raptor.hp), 0),
      raptorHpMax: view.raptors.reduce((sum, raptor) => sum + raptor.hpMax, 0),
      sixPresent: view.imaginarySix?.present === true,
      tier: view.tier,
    });

    this.secondsSinceStatsReport = 0;
  }
}
