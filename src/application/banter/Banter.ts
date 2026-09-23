import type { RandomStream } from '../../domain/shared/random';
import type { DomainEvent } from '../../domain/shared/events';
import type { BanterLine, BanterPriority, BanterTrigger } from './lines';
import { speakerName } from './lines';

/** What the overlay shows. No ids, no markup. `partnerName` is the other portrait in a scene. */
export interface CommsLine {
  readonly speakerName: string;
  readonly text: string;
  readonly partnerName?: string | null;
}

export interface BanterContext {
  readonly secondsRemaining: number;
  readonly hull: number;
  /** 0–100. Spool lines use this for `{percent}`. Omitted means 0. */
  readonly spoolPercent?: number;
  /** Healthy civilian hulls. Dualla's `{count}`. Omitted means 0. */
  readonly readyShips?: number;
  /** Civilian hulls on the line. Dualla's `{total}`. Omitted means 0. */
  readonly shipTotal?: number;
  /** Card ids on the Recovering table. An offer line plays only when its card is here. */
  readonly offeredCardIds?: readonly string[];
  /** Resurrection-ship hull remaining, 0–100. Milestone lines use this for `{percent}`. */
  readonly shipPercent?: number;
}

/** XOR'd with the run seed so a joke never consumes the scenario stream (ADR-0001 D3). */
export function banterSeed(runSeed: number): number {
  return (runSeed ^ 0xba47e2) >>> 0;
}

/**
 * Reading time from PRD 12.2, Normal multiplier. Short and Long wait for the settings screen.
 * `clamp(1.5 + characters / 12, 4, 8)`.
 */
export function commsDurationSeconds(text: string): number {
  return Math.min(8, Math.max(4, 1.5 + text.length / 12));
}

function priorityRank(priority: BanterPriority): number {
  if (priority === 'critical') return 3;
  if (priority === 'normal') return 2;
  return 1;
}

interface ShownLine {
  readonly id: string;
  readonly trigger: BanterTrigger;
  readonly priority: BanterPriority;
  readonly line: CommsLine;
  remainingSeconds: number;
}

/**
 * Picks one comms line from domain events. Low priority is dropped, not queued (PRD 12.2).
 * Flavor stays quiet when the hull is at 1. The clock is the caller's, so pause freezes a line.
 */
export class Banter {
  private readonly readyAtSeconds = new Map<string, number>();
  private elapsedSeconds = 0;
  private shown: ShownLine | null = null;

  constructor(
    private readonly random: RandomStream,
    private readonly lines: readonly BanterLine[],
  ) {}

  get line(): CommsLine | null {
    return this.shown?.line ?? null;
  }

  observe(events: readonly DomainEvent[], context: BanterContext): void {
    const crisis = context.hull <= 1 || events.some((event) => event.type === 'ResurrectionShipArrived');
    const poolOpen = new Map<string, boolean>();
    const candidates: BanterLine[] = [];
    for (const event of events) {
      for (const trigger of triggersFor(event)) {
        for (const line of this.lines) {
          if (line.trigger !== trigger) continue;
          if (line.priority === 'flavor' && crisis) continue;
          if ((this.readyAtSeconds.get(line.id) ?? 0) > this.elapsedSeconds) continue;
          if (!this.poolIsOpen(line, poolOpen)) continue;
          if (!offerMatches(line, context.offeredCardIds)) continue;
          candidates.push(line);
        }
      }
    }

    const chosen = this.pickHighest(candidates);
    if (chosen === null) return;
    // A new hand replaces whatever was still on the strip. The jump is over.
    if (chosen.trigger !== 'UpgradeOffered') {
      if (this.shown !== null && priorityRank(chosen.priority) <= priorityRank(this.shown.priority)) return;
    }

    this.show(chosen, context);
  }

  /**
   * A derived line. A louder one can replace what is showing. The same trigger can replace itself,
   * so a later spool call updates the countdown. Anything else waits.
   */
  mention(trigger: BanterTrigger, context: BanterContext): boolean {
    const crisis = context.hull <= 1;
    const ready = this.lines.filter((line) => {
      if (line.trigger !== trigger) return false;
      if (line.priority === 'flavor' && crisis) return false;
      return (this.readyAtSeconds.get(line.id) ?? 0) <= this.elapsedSeconds;
    });
    const best = ready.reduce((rank, line) => Math.max(rank, priorityRank(line.priority)), 0);
    if (best === 0) return false;
    if (this.shown !== null && !replaces(best, this.shown, trigger)) return false;

    const poolOpen = new Map<string, boolean>();
    const candidates = ready.filter((line) => this.poolIsOpen(line, poolOpen));
    const chosen = this.pickHighest(candidates);
    if (chosen === null) return false;
    this.show(chosen, context);
    return true;
  }

  private show(chosen: BanterLine, context: BanterContext): void {
    const text = fillPlaceholders(chosen.text, context, chosen.trigger);
    this.shown = {
      id: chosen.id,
      trigger: chosen.trigger,
      priority: chosen.priority,
      line: { speakerName: speakerName(chosen.speaker), text },
      remainingSeconds: commsDurationSeconds(text),
    };
    this.readyAtSeconds.set(chosen.id, this.elapsedSeconds + chosen.cooldownSeconds);
  }

  /** Game seconds. A paused session simply stops calling this. */
  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.shown === null) {
      if (Number.isFinite(seconds) && seconds > 0) this.elapsedSeconds += seconds;
      return;
    }
    this.elapsedSeconds += seconds;
    this.shown.remainingSeconds -= seconds;
    if (this.shown.remainingSeconds <= 0) this.shown = null;
  }

  /** One roll per pool per observe. Chance 1 does not touch the stream. */
  private poolIsOpen(line: BanterLine, poolOpen: Map<string, boolean>): boolean {
    const known = poolOpen.get(line.poolId);
    if (known !== undefined) return known;
    const open = line.chance >= 1 || this.random.next() < line.chance;
    poolOpen.set(line.poolId, open);
    return open;
  }

  private pickHighest(candidates: readonly BanterLine[]): BanterLine | null {
    const first = candidates[0];
    if (!first) return null;
    let best = priorityRank(first.priority);
    for (const line of candidates) best = Math.max(best, priorityRank(line.priority));
    const group = candidates.filter((line) => priorityRank(line.priority) === best);
    return pickWeighted(group, this.random);
  }
}

function replaces(best: number, shown: ShownLine, trigger: BanterTrigger): boolean {
  const rank = priorityRank(shown.priority);
  if (best > rank) return true;
  return best === rank && shown.trigger === trigger;
}

function fillPlaceholders(text: string, context: BanterContext, trigger: BanterTrigger): string {
  const percent = trigger === 'ResurrectionShipMilestone' ? (context.shipPercent ?? 0) : (context.spoolPercent ?? 0);
  return text
    .replaceAll('{seconds}', String(Math.max(0, Math.ceil(context.secondsRemaining))))
    .replaceAll('{percent}', String(percent))
    .replaceAll('{count}', String(context.readyShips ?? 0))
    .replaceAll('{total}', String(context.shipTotal ?? 0));
}

function offerMatches(line: BanterLine, offered: readonly string[] | undefined): boolean {
  if (line.upgradeId === undefined) return true;
  return (offered ?? []).includes(line.upgradeId);
}

function triggersFor(event: DomainEvent): readonly BanterTrigger[] {
  switch (event.type) {
    case 'CyclePhaseChanged':
      if (event.phase === 'arriving') return ['CycleStarted'];
      if (event.phase === 'spooling') return ['FtlSpoolProgress'];
      if (event.phase === 'recovering') return ['CycleRecovering', 'UpgradeOffered'];
      return [];
    case 'UpgradeRerolled':
      return ['UpgradeOffered'];
    case 'ResurrectionShipArrived':
      return ['ResurrectionShipArrived'];
    case 'SpeechStarted':
      return ['SpecialUsed'];
    case 'RunWon':
      return ['RunWon'];
    case 'RunLost':
      return ['FleetLost'];
    case 'MissileFired':
      return ['MissileLaunched'];
    case 'FleetHit':
      return ['FleetHit'];
    case 'ResurrectionShipDestroyed':
      return ['ResurrectionShipDestroyed'];
    case 'RaiderSpawned':
      return event.returned ? ['RaiderResurrected'] : [];
    default:
      return [];
  }
}

function pickWeighted(lines: readonly BanterLine[], random: RandomStream): BanterLine | null {
  const first = lines[0];
  if (!first) return null;
  if (lines.length === 1) return first;
  const total = lines.reduce((sum, line) => sum + line.weight, 0);
  let roll = random.next() * total;
  for (const line of lines) {
    roll -= line.weight;
    if (roll < 0) return line;
  }
  return lines[lines.length - 1] ?? first;
}
