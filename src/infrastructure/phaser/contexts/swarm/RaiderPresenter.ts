import Phaser from 'phaser';
import { FLEET_LINE_Y_UNITS } from '../../../../domain/fleet/integrity';
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

interface HullMark {
  hull: Phaser.GameObjects.Container;
  pips: Phaser.GameObjects.Rectangle[];
  eye: Phaser.GameObjects.Rectangle;
  sweep: Phaser.Tweens.Tween | null;
  fade: Phaser.Tweens.Tween | null;
}

/**
 * Draws the Raiders. Placeholder art: an arrowhead hull and a sweeping red eye. A still eye means
 * this one does not hold an attack token; a sweep means it may fire (PRD 9). The hull is not red,
 * because only Cylons are.
 */
export class RaiderPresenter implements Presenter {
  private readonly scene: Phaser.Scene;
  private readonly fadeMs: number;
  private readonly sweepMs: number;

  private readonly hulls = new Map<number, HullMark>();
  private readonly blips = new Map<number, { root: Phaser.GameObjects.Container; pips: Phaser.GameObjects.Rectangle[] }>();
  private readonly dives = new Map<number, { line: Phaser.GameObjects.Rectangle; chevron: Phaser.GameObjects.Rectangle }>();

  constructor(scene: Phaser.Scene, prefersReducedMotion: boolean) {
    this.scene = scene;
    this.fadeMs = prefersReducedMotion ? 0 : DESTROY_FADE_MS;
    this.sweepMs = prefersReducedMotion ? 0 : EYE_SWEEP_MS;
  }

  onEvent(event: DomainEvent): void {
    if (event.type === 'RaiderSpawned') {
      this.forget(event.id);
      this.hulls.set(event.id, this.build(event.x, event.y, event.returned));
      return;
    }

    if (event.type === 'RaiderDestroyed') {
      this.fadeOut(event.id);
    }
  }

  sync(view: GameView, alpha: number): void {
    this.syncGhosts(view);

    const live = new Set(view.raiders.map((raider) => raider.id));
    for (const [id, mark] of this.hulls) {
      if (live.has(id) || mark.fade) continue;
      mark.hull.destroy();
      this.hulls.delete(id);
    }

    for (const raider of view.raiders) {
      const mark = this.hulls.get(raider.id);
      if (!mark || mark.fade) continue;

      mark.hull.x = Phaser.Math.Linear(raider.previousX, raider.x, alpha);
      mark.hull.y = Phaser.Math.Linear(raider.previousY, raider.y, alpha);
      mark.hull.setAlpha(raider.protected ? 0.55 : 1);
      this.drawPips(mark.pips, raider);
      this.syncEye(mark, raider.armed);
      this.syncDive(raider, mark.hull.x, mark.hull.y);
    }

    const strafing = new Set(view.raiders.filter((raider) => raider.strafing).map((raider) => raider.id));
    for (const [id, dive] of this.dives) {
      if (strafing.has(id)) continue;
      dive.line.destroy();
      dive.chevron.destroy();
      this.dives.delete(id);
    }
  }

  private syncDive(raider: RaiderView, x: number, y: number): void {
    if (!raider.strafing) return;
    let dive = this.dives.get(raider.id);
    if (!dive) {
      const line = this.scene.add.rectangle(x, y, 1, 1, PALETTE.strayShot, 0.45);
      const chevron = this.scene.add.rectangle(x, FLEET_LINE_Y_UNITS, 5, 5, PALETTE.strayShot, 0.9);
      chevron.setAngle(45);
      dive = { line, chevron };
      this.dives.set(raider.id, dive);
    }
    const span = Math.max(0, FLEET_LINE_Y_UNITS - y);
    dive.line.setPosition(x, y + span / 2);
    dive.line.setSize(1, span);
    dive.chevron.setPosition(x, FLEET_LINE_Y_UNITS);
  }

  private syncEye(mark: HullMark, armed: boolean): void {
    if (mark.sweep) mark.sweep.timeScale = armed ? 1 : 0;
    if (!armed) mark.eye.x = 0;
  }

  private syncGhosts(view: GameView): void {
    // A download bar means the loop is still on. After the ship is gone, new kills do not spawn a
    // blip. Grey-out / "offline" treatment of leftover ghosts waits for the graphics pass (PRD 6).
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

  private build(x: number, y: number, returned: boolean): HullMark {
    const width = RAIDER_HALF_WIDTH_UNITS * 2;
    const height = RAIDER_HALF_HEIGHT_UNITS * 2;

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
    parts.push(...pips);

    let sweep: Phaser.Tweens.Tween | null = null;
    if (this.sweepMs > 0) {
      sweep = this.scene.tweens.add({
        targets: eye,
        x: { from: -4, to: 4 },
        duration: this.sweepMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
    }

    return {
      hull: this.scene.add.container(x, y, parts),
      pips,
      eye,
      sweep,
      fade: null,
    };
  }

  private drawPips(pips: readonly Phaser.GameObjects.Rectangle[], raider: RaiderView): void {
    for (const [index, pip] of pips.entries()) {
      pip.setVisible(index < raider.hp);
    }
  }

  private fadeOut(id: number): void {
    const mark = this.hulls.get(id);
    if (!mark) return;

    mark.fade?.remove();
    if (this.fadeMs === 0) {
      this.forget(id);
      return;
    }

    mark.fade = this.scene.tweens.add({
      targets: mark.hull,
      alpha: 0,
      duration: this.fadeMs,
      onComplete: () => {
        if (this.hulls.get(id) === mark) this.forget(id);
      },
    });
  }

  private forget(id: number): void {
    const mark = this.hulls.get(id);
    if (!mark) return;
    mark.fade?.remove();
    mark.sweep?.remove();
    mark.hull.destroy();
    const dive = this.dives.get(id);
    if (dive) {
      dive.line.destroy();
      dive.chevron.destroy();
      this.dives.delete(id);
    }
    this.hulls.delete(id);
  }
}
