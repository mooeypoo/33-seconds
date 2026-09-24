import { VIPER_RADIUS_UNITS } from '../../domain/combat/viper';
import type { DomainEvent } from '../../domain/shared/events';
import type { BanterTrigger } from './lines';

/**
 * How the written lines meet the fight. These are assumptions until a playtest says otherwise.
 */
export const HULL_LOW_AT = 2;
export const KILL_DROUGHT_SECONDS = 12;
export const MULTI_KILL_COUNT = 3;
export const MULTI_KILL_WINDOW_SECONDS = 2;
/** A Cylon round that misses, but passes inside this of the Viper's center. */
export const CLOSE_CALL_UNITS = 16;
/** Extra spool calls, in whole seconds left. The phase change already speaks at the start. */
export const SPOOL_CALLOUT_SECONDS = [5, 2] as const;
const SHIP_MARKS = [0.75, 0.5, 0.25] as const;

export interface Cue {
  readonly trigger: BanterTrigger;
  readonly token: string;
  readonly shipPercent?: number;
}

export interface CueShot {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly previousX: number;
  readonly previousY: number;
  readonly owner: 'player' | 'cylon';
}

export interface CueSnapshot {
  readonly phase: 'arriving' | 'building' | 'spooling' | 'jumping' | 'recovering';
  readonly secondsRemaining: number;
  readonly hull: number;
  readonly viperX: number;
  readonly viperY: number;
  readonly shots: readonly CueShot[];
  readonly shipHp: number | null;
  readonly shipHpMax: number | null;
}

const COMBAT = new Set<CueSnapshot['phase']>(['arriving', 'building', 'spooling']);

/** True when the closest point on the segment lies in the miss-ring around the Viper. */
export function grazedTheViper(
  shot: CueShot,
  viperX: number,
  viperY: number,
  closeUnits = CLOSE_CALL_UNITS,
): boolean {
  const dx = shot.x - shot.previousX;
  const dy = shot.y - shot.previousY;
  const len2 = dx * dx + dy * dy;
  let along = 0;
  if (len2 > 0) {
    along = ((viperX - shot.previousX) * dx + (viperY - shot.previousY) * dy) / len2;
    if (along < 0) along = 0;
    if (along > 1) along = 1;
  }
  const closestX = shot.previousX + dx * along;
  const closestY = shot.previousY + dy * along;
  const dist2 = (closestX - viperX) ** 2 + (closestY - viperY) ** 2;
  return dist2 > VIPER_RADIUS_UNITS * VIPER_RADIUS_UNITS && dist2 <= closeUnits * closeUnits;
}

/**
 * Notices that are not their own domain event. `accept` is called when the line actually plays,
 * so a busy strip retries instead of dropping the moment.
 */
export class BanterCues {
  private clock = 0;
  private sinceKill = 0;
  private killTimes: number[] = [];
  private hullLowSaid = false;
  private closeOwed = false;
  private readonly grazed = new Set<number>();
  private shipMarksSaid = 0;
  private readonly spoolSaid = new Set<number>();
  private readonly pending = new Map<string, Cue>();

  reset(): void {
    this.clock = 0;
    this.sinceKill = 0;
    this.killTimes = [];
    this.hullLowSaid = false;
    this.closeOwed = false;
    this.grazed.clear();
    this.shipMarksSaid = 0;
    this.spoolSaid.clear();
    this.pending.clear();
  }

  accept(cue: Cue): void {
    this.pending.delete(cue.token);
    if (cue.token === 'multi') this.killTimes = [];
    if (cue.token === 'drought') this.sinceKill = 0;
    if (cue.token === 'hull') this.hullLowSaid = true;
    if (cue.token === 'close') this.closeOwed = false;
    if (cue.token.startsWith('ship:')) this.shipMarksSaid = Number(cue.token.slice(5));
    if (cue.token.startsWith('spool:')) this.spoolSaid.add(Number(cue.token.slice(6)));
  }

  note(events: readonly DomainEvent[], view: CueSnapshot, deltaSeconds: number): readonly Cue[] {
    const combat = COMBAT.has(view.phase);
    if (combat) {
      this.clock += deltaSeconds;
      this.sinceKill += deltaSeconds;
    }
    if (events.some((event) => event.type === 'RaiderDestroyed')) {
      this.killTimes.push(this.clock);
      this.sinceKill = 0;
    }
    this.killTimes = this.killTimes.filter((time) => this.clock - time <= MULTI_KILL_WINDOW_SECONDS);

    if (combat && this.killTimes.length >= MULTI_KILL_COUNT) this.offer({ trigger: 'MultiKill', token: 'multi' });
    if (combat && this.sinceKill >= KILL_DROUGHT_SECONDS) this.offer({ trigger: 'KillDrought', token: 'drought' });

    if (view.hull > HULL_LOW_AT) {
      this.hullLowSaid = false;
      this.pending.delete('hull');
    } else if (combat && !this.hullLowSaid) this.offer({ trigger: 'HullLow', token: 'hull' });

    this.noticeGraze(view, combat);
    this.noticeShip(view);
    this.noticeSpool(view);

    if (this.killTimes.length < MULTI_KILL_COUNT) this.pending.delete('multi');
    if (this.sinceKill < KILL_DROUGHT_SECONDS) this.pending.delete('drought');
    if (!this.closeOwed) this.pending.delete('close');

    return [...this.pending.values()];
  }

  private offer(cue: Cue): void {
    this.pending.set(cue.token, cue);
  }

  private noticeGraze(view: CueSnapshot, combat: boolean): void {
    if (!combat) return;
    const live = new Set<number>();
    for (const shot of view.shots) {
      if (shot.owner !== 'cylon') continue;
      live.add(shot.id);
      if (this.grazed.has(shot.id)) continue;
      if (!grazedTheViper(shot, view.viperX, view.viperY)) continue;
      this.grazed.add(shot.id);
      this.closeOwed = true;
    }
    for (const id of this.grazed) {
      if (!live.has(id)) this.grazed.delete(id);
    }
    if (this.closeOwed) this.offer({ trigger: 'CloseCall', token: 'close' });
  }

  private noticeShip(view: CueSnapshot): void {
    this.dropPrefix('ship:');
    if (view.shipHp === null || view.shipHpMax === null || view.shipHpMax <= 0 || view.shipHp <= 0) return;
    const ratio = view.shipHp / view.shipHpMax;
    const due = SHIP_MARKS.filter((mark) => ratio <= mark).length;
    if (due <= this.shipMarksSaid) return;
    this.offer({
      trigger: 'ResurrectionShipMilestone',
      token: `ship:${String(due)}`,
      shipPercent: Math.round(ratio * 100),
    });
  }

  private noticeSpool(view: CueSnapshot): void {
    if (view.phase !== 'spooling') {
      this.spoolSaid.clear();
      this.dropPrefix('spool:');
      return;
    }
    this.dropPrefix('spool:');
    if (!SPOOL_CALLOUT_SECONDS.some((seconds) => seconds === view.secondsRemaining)) return;
    if (this.spoolSaid.has(view.secondsRemaining)) return;
    this.offer({ trigger: 'FtlSpoolProgress', token: `spool:${String(view.secondsRemaining)}` });
  }

  private dropPrefix(prefix: string): void {
    for (const token of this.pending.keys()) {
      if (token.startsWith(prefix)) this.pending.delete(token);
    }
  }
}
