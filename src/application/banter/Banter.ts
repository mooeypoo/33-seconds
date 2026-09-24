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

/** Silence after a line clears, so the strip breathes. Only a critical line speaks into it (PRD 12.2). */
export const COMMS_GAP_SECONDS = 3;
/** Flavor lines per cycle. Critical and normal lines do not count (PRD 12.2). */
export const FLAVOR_LINES_PER_CYCLE = 3;
/** A flavor line is up at least this long before a newer flavor line may take the strip. */
export const COMMS_MIN_SHOWN_SECONDS = 2;

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
  readonly shownAtSeconds: number;
  remainingSeconds: number;
}

/**
 * Picks one comms line from domain events. Nothing is queued: a line that cannot speak now is
 * dropped, so the strip never talks about something that is long over (PRD 12.2). Flavor stays
 * quiet when the hull is at 1. The clock is the caller's, so pause freezes a line.
 */
export class Banter {
  private readonly readyAtSeconds = new Map<string, number>();
  private elapsedSeconds = 0;
  private quietUntilSeconds = 0;
  private flavorShownThisCycle = 0;
  private shown: ShownLine | null = null;

  constructor(
    private readonly random: RandomStream,
    private readonly lines: readonly BanterLine[],
  ) {}

  get line(): CommsLine | null {
    return this.shown?.line ?? null;
  }

  observe(events: readonly DomainEvent[], context: BanterContext): void {
    // A new cycle gets a fresh flavor budget, and its opening line never waits on the last cycle's gap.
    if (events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'arriving')) {
      this.flavorShownThisCycle = 0;
      this.quietUntilSeconds = 0;
    }
    const crisis = context.hull <= 1 || events.some((event) => event.type === 'ResurrectionShipArrived');
    const poolOpen = new Map<string, boolean>();
    let chosen: BanterLine | null = null;
    for (const event of events) {
      for (const trigger of triggersFor(event)) {
        const candidates = this.lines.filter(
          (line) =>
            line.trigger === trigger &&
            this.eligible(line, crisis) &&
            offerMatches(line, context.offeredCardIds) &&
            this.poolIsOpen(line, poolOpen),
        );
        const heard = this.pickOne(candidates);
        if (heard !== null && (chosen === null || priorityRank(heard.priority) > priorityRank(chosen.priority))) {
          chosen = heard;
        }
      }
    }

    if (chosen === null) return;
    // A new hand replaces whatever was still on the strip. The jump is over.
    if (chosen.trigger !== 'UpgradeOffered' && !this.mayReplace(chosen, false)) return;
    this.show(chosen, context);
  }

  /**
   * A derived line. A louder one can replace what is showing. The same trigger can replace itself,
   * so a later spool call updates the countdown. Anything else waits.
   */
  mention(trigger: BanterTrigger, context: BanterContext): boolean {
    const crisis = context.hull <= 1;
    const poolOpen = new Map<string, boolean>();
    const candidates = this.lines.filter(
      (line) => line.trigger === trigger && this.eligible(line, crisis) && this.poolIsOpen(line, poolOpen),
    );
    const chosen = this.pickOne(candidates);
    if (chosen === null || !this.mayReplace(chosen, true)) return false;
    this.show(chosen, context);
    return true;
  }

  /** Cooldowns, the crisis rule, the gap after a line, and the flavor budget. */
  private eligible(line: BanterLine, crisis: boolean): boolean {
    if ((this.readyAtSeconds.get(cooldownKey(line)) ?? 0) > this.elapsedSeconds) return false;
    if (line.priority === 'critical') return true;
    if (this.elapsedSeconds < this.quietUntilSeconds) return false;
    if (line.priority !== 'flavor') return true;
    return !crisis && this.flavorShownThisCycle < FLAVOR_LINES_PER_CYCLE;
  }

  /**
   * A louder line always takes the strip. A same-trigger mention can update itself (the spool
   * countdown). A flavor line that has been read for a moment gives way to a newer one, so the
   * strip follows the fight instead of lagging behind it.
   */
  private mayReplace(chosen: BanterLine, sameTriggerReplaces: boolean): boolean {
    if (this.shown === null) return true;
    const rank = priorityRank(chosen.priority);
    const shownRank = priorityRank(this.shown.priority);
    if (rank > shownRank) return true;
    if (rank < shownRank) return false;
    if (sameTriggerReplaces && this.shown.trigger === chosen.trigger) return true;
    return (
      chosen.priority === 'flavor' && this.elapsedSeconds - this.shown.shownAtSeconds >= COMMS_MIN_SHOWN_SECONDS
    );
  }

  private show(chosen: BanterLine, context: BanterContext): void {
    const text = fillPlaceholders(chosen.text, context, chosen.trigger);
    this.shown = {
      id: chosen.id,
      trigger: chosen.trigger,
      priority: chosen.priority,
      line: { speakerName: speakerName(chosen.speaker), text },
      shownAtSeconds: this.elapsedSeconds,
      remainingSeconds: commsDurationSeconds(text),
    };
    this.readyAtSeconds.set(cooldownKey(chosen), this.elapsedSeconds + chosen.cooldownSeconds);
    if (chosen.priority === 'flavor') this.flavorShownThisCycle += 1;
  }

  /** Drops the line on the strip, if any. Cooldowns are kept, so it does not come straight back. */
  silence(): void {
    this.shown = null;
  }

  /** Game seconds. A paused session simply stops calling this. */
  advance(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsedSeconds += seconds;
    if (this.shown === null) return;
    this.shown.remainingSeconds -= seconds;
    if (this.shown.remainingSeconds > 0) return;
    // The gap starts when the line ran out, not at the end of this (possibly long) step.
    this.quietUntilSeconds = this.elapsedSeconds + this.shown.remainingSeconds + COMMS_GAP_SECONDS;
    this.shown = null;
  }

  /** One roll per pool per observe. Chance 1 does not touch the stream. */
  private poolIsOpen(line: BanterLine, poolOpen: Map<string, boolean>): boolean {
    const known = poolOpen.get(line.poolId);
    if (known !== undefined) return known;
    const open = line.chance >= 1 || this.random.next() < line.chance;
    poolOpen.set(line.poolId, open);
    return open;
  }

  /**
   * One response per moment: every speaker who may answer has the same chance, whatever their
   * priority, so a quieter character still gets a word in. Then a joke from that speaker's pool.
   */
  private pickOne(candidates: readonly BanterLine[]): BanterLine | null {
    const pools = [...new Set(candidates.map((line) => line.poolId))];
    if (pools.length === 0) return null;
    const pool = pools.length === 1 ? pools[0] : pools[Math.min(pools.length - 1, Math.floor(this.random.next() * pools.length))];
    return pickWeighted(
      candidates.filter((line) => line.poolId === pool),
      this.random,
    );
  }
}

/**
 * A speaker who has just answered a moment does not answer it again with another joke (PRD 12.2).
 * Critical calls keep one cooldown per line, so the spool countdown can speak at every mark.
 */
function cooldownKey(line: BanterLine): string {
  return line.priority === 'critical' ? line.id : `${line.speaker}:${line.trigger}`;
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
      if (event.heavy) return ['BigRaiderEntered'];
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
