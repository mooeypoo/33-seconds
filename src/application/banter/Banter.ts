import type { RandomStream } from '../../domain/shared/random';
import type { DomainEvent } from '../../domain/shared/events';
import type { BanterLine, BanterPriority, BanterTrigger } from './lines';
import { speakerName } from './lines';

/** What the overlay shows. No ids, no markup. */
export interface CommsLine {
  readonly speakerName: string;
  readonly text: string;
}

export interface BanterContext {
  readonly secondsRemaining: number;
  readonly hull: number;
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
    const candidates: BanterLine[] = [];
    for (const event of events) {
      const trigger = triggerFor(event);
      if (trigger === null) continue;
      for (const line of this.lines) {
        if (line.trigger !== trigger) continue;
        if (line.priority === 'flavor' && crisis) continue;
        if ((this.readyAtSeconds.get(line.id) ?? 0) > this.elapsedSeconds) continue;
        candidates.push(line);
      }
    }

    const chosen = this.pickHighest(candidates);
    if (chosen === null) return;
    if (this.shown !== null && priorityRank(chosen.priority) <= priorityRank(this.shown.priority)) return;

    const text = chosen.text.replaceAll('{seconds}', String(Math.max(0, Math.ceil(context.secondsRemaining))));
    this.shown = {
      id: chosen.id,
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

  private pickHighest(candidates: readonly BanterLine[]): BanterLine | null {
    const first = candidates[0];
    if (!first) return null;
    let best = priorityRank(first.priority);
    for (const line of candidates) best = Math.max(best, priorityRank(line.priority));
    const group = candidates.filter((line) => priorityRank(line.priority) === best);
    return pickWeighted(group, this.random);
  }
}

function triggerFor(event: DomainEvent): BanterTrigger | null {
  switch (event.type) {
    case 'CyclePhaseChanged':
      if (event.phase === 'arriving') return 'CycleStarted';
      if (event.phase === 'spooling') return 'FtlSpoolProgress';
      if (event.phase === 'recovering') return 'CycleRecovering';
      return null;
    case 'ResurrectionShipArrived':
      return 'ResurrectionShipArrived';
    case 'SpeechStarted':
      return 'SpecialUsed';
    case 'RunWon':
      return 'RunWon';
    case 'RunLost':
      return 'FleetLost';
    case 'MissileFired':
      return 'MissileLaunched';
    default:
      return null;
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
