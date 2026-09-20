import Phaser from 'phaser';
import { RAIDER_HALF_HEIGHT_UNITS, RAIDER_HALF_WIDTH_UNITS, RAIDER_HIT_POINTS } from '../../../../domain/swarm/raider';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../../../../domain/swarm/resurrection';
import type { DomainEvent } from '../../../../domain/shared/events';
import { WORLD_HEIGHT_UNITS, WORLD_WIDTH_UNITS, clamp } from '../../../../domain/shared/world';
import type { GameView, GhostView, RaiderView } from '../../../../domain/views';
import type { Presenter } from '../../Presenter';
import { PALETTE } from '../../shared/palette';

/** One sweep of the eye, in milliseconds. Slow on purpose: it is a tell, not a flash (PRD 15). */
const EYE_SWEEP_MS = 900;

const DESTROY_FADE_MS = 140;

/** Quiet download tell (PRD 6). Wide enough to read as a wait, small enough not to be a HUD. */
const DOWNLOAD_BAR_WIDTH = 20;
const DOWNLOAD_BAR_HEIGHT = 2;
const DOWNLOAD_TICKS = 5;

/**
 * Draws the Raider. Placeholder art: an arrowhead hull and a sweeping red eye. The eye is the
 * "this is a Cylon" tell; the hull is not red, because only Cylons are (PRD 9).
 */
export class RaiderPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly fadeMs: number;
  private readonly sweepMs: number;

  private hull: Phaser.GameObjects.Container | null = null;
  private pips: Phaser.GameObjects.Rectangle[] = [];
  private shownId: number | null = null;
  private fade: Phaser.Tweens.Tween | null = null;
  private readonly blips = new Map<number, { root: Phaser.GameObjects.Container; pips: Phaser.GameObjects.Rectangle[] }>();

  constructor(scene: Phaser.Scene, prefersReducedMotion: boolean) {
    this.scene = scene;
    this.fadeMs = prefersReducedMotion ? 0 : DESTROY_FADE_MS;
    this.sweepMs = prefersReducedMotion ? 0 : EYE_SWEEP_MS;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'RaiderSpawned') {
      this.fade?.remove();
      this.hull?.destroy();
      this.hull = this.build(event.x, event.y, event.returned);
      this.shownId = event.id;
      return;
    }

    if (event.type === 'RaiderDestroyed' && event.id === this.shownId) {
      this.fadeOut();
    }
  }

  sync(view: GameView, alpha: number): void {
    this.syncGhosts(view);

    const raider = view.raider;
    if (!raider) {
      // A jump clears the Raider without a kill. A fade-out from a real destroy is left to finish.
      if (!this.fade) {
        this.hull?.destroy();
        this.hull = null;
        this.shownId = null;
      }
      return;
    }

    const hull = this.hull;
    if (!hull || raider.id !== this.shownId) return;

    hull.x = Phaser.Math.Linear(raider.previousX, raider.x, alpha);
    hull.y = Phaser.Math.Linear(raider.previousY, raider.y, alpha);
    // Shape cue (the ring) plus a fade: color is never the only tell (PRD 9, 16).
    hull.setAlpha(raider.protected ? 0.55 : 1);
    this.drawPips(raider);
  }

  private syncGhosts(view: GameView): void {
    const live = new Set(view.ghosts.map((ghost) => ghost.identityId));

    for (const [identityId, mark] of this.blips) {
      if (live.has(identityId)) continue;
      mark.root.destroy();
      this.blips.delete(identityId);
    }

    for (const ghost of view.ghosts) {
      const existing = this.blips.get(ghost.identityId);
      const mark = existing ?? this.buildGhost(ghost);
      mark.root.setPosition(this.ghostX(ghost.x), this.ghostY(ghost.y));
      this.setDownloadPips(mark.pips, ghost.remainingSeconds);
    }
  }

  private buildGhost(ghost: GhostView): { root: Phaser.GameObjects.Container; pips: Phaser.GameObjects.Rectangle[] } {
    const diamond = this.scene.add.rectangle(0, -6, 5, 5, PALETTE.ghostBlip, 0.55);
    diamond.setAngle(45);

    const track = this.scene.add.rectangle(0, 3, DOWNLOAD_BAR_WIDTH + 2, DOWNLOAD_BAR_HEIGHT + 2, PALETTE.ghostBlip, 0.16);
    const pips: Phaser.GameObjects.Rectangle[] = [];
    const gap = DOWNLOAD_BAR_WIDTH / DOWNLOAD_TICKS;
    for (let i = 0; i < DOWNLOAD_TICKS; i++) {
      const x = -DOWNLOAD_BAR_WIDTH / 2 + gap / 2 + i * gap;
      pips.push(this.scene.add.rectangle(x, 3, 3, DOWNLOAD_BAR_HEIGHT, PALETTE.ghostBlip, 0.28));
    }

    const root = this.scene.add.container(ghost.x, ghost.y, [diamond, track, ...pips]);
    root.setDepth(-1);
    const mark = { root, pips };
    this.blips.set(ghost.identityId, mark);
    return mark;
  }

  private setDownloadPips(pips: readonly Phaser.GameObjects.Rectangle[], remainingSeconds: number): void {
    const progress = clamp(1 - remainingSeconds / RESURRECTION_DOWNLOAD_SECONDS, 0, 1);
    const lit = Math.round(progress * DOWNLOAD_TICKS);
    for (const [index, pip] of pips.entries()) {
      pip.setAlpha(index < lit ? 0.95 : 0.28);
    }
  }

  private ghostX(x: number): number {
    return clamp(x, DOWNLOAD_BAR_WIDTH / 2 + 1, WORLD_WIDTH_UNITS - DOWNLOAD_BAR_WIDTH / 2 - 1);
  }

  private ghostY(y: number): number {
    return clamp(y, 10, WORLD_HEIGHT_UNITS - 10);
  }

  private build(x: number, y: number, returned: boolean): Phaser.GameObjects.Container {
    const width = RAIDER_HALF_WIDTH_UNITS * 2;
    const height = RAIDER_HALF_HEIGHT_UNITS * 2;

    // Pointing down: the fleet is the thing it is flying at.
    const body = this.scene.add.rectangle(0, -1, width, height - 4, PALETTE.raiderHull);
    const nose = this.scene.add.rectangle(0, height / 2 - 1, 6, 5, PALETTE.raiderHull);
    const eye = this.scene.add.rectangle(0, -2, 5, 2, PALETTE.cylonRed);
    const parts: Phaser.GameObjects.GameObject[] = [body, nose, eye];

    if (returned) {
      const ring = this.scene.add.rectangle(0, 0, width + 6, height + 6, PALETTE.ghostBlip, 0);
      ring.setStrokeStyle(1, PALETTE.ghostBlip, 0.9);
      parts.unshift(ring);
    }

    const pips: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < RAIDER_HIT_POINTS; i++) {
      const pip = this.scene.add.rectangle((i - 1) * 4, -height / 2 - 3, 3, 2, PALETTE.cylonRed);
      pips.push(pip);
    }
    this.pips = pips;
    parts.push(...pips);

    if (this.sweepMs > 0) {
      this.scene.tweens.add({
        targets: eye,
        x: { from: -4, to: 4 },
        duration: this.sweepMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    return this.scene.add.container(x, y, parts);
  }

  private drawPips(raider: RaiderView): void {
    for (const [index, pip] of this.pips.entries()) {
      pip.setVisible(index < raider.hp);
    }
  }

  private fadeOut(): void {
    const hull = this.hull;
    if (!hull) return;

    this.fade?.remove();
    if (this.fadeMs === 0) {
      hull.destroy();
      this.hull = null;
      this.shownId = null;
      return;
    }

    this.fade = this.scene.tweens.add({
      targets: hull,
      alpha: 0,
      duration: this.fadeMs,
      onComplete: () => {
        hull.destroy();
        if (this.hull === hull) {
          this.hull = null;
          this.shownId = null;
        }
      },
    });
  }
}
