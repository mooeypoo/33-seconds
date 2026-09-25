import type { DomainEvent } from '../../domain/shared/events';
import { TICK_SECONDS } from '../../domain/shared/time';
import type { GameView } from '../../domain/views';
import { speakBeats, type Lesson, type LessonFocus, type LessonTrigger, type SpokenBeat, type TrainingScript } from './trainingScript';

/**
 * Game seconds after the fight resumes before the next lesson may stop it again. Without it, a kill,
 * a hit, and a fleet hit in one second would be three pauses and three 3-2-1s in a row.
 * ASSUMPTION: 3 s, until someone plays it.
 */
export const LESSON_GAP_SECONDS = 3;

/** A lesson as the overlay shows it, placeholders filled. */
export interface LessonCard {
  readonly id: string;
  readonly heading: string;
  readonly focus: LessonFocus | null;
  readonly beats: readonly SpokenBeat[];
  /** False over the pick sheet, which already waits for the player and is never paused (PRD 13.3). */
  readonly pauses: boolean;
}

/**
 * Decides which lesson is due in a Training Run (PRD 5.5). It only watches: domain events and the
 * read-only view go in, lesson cards come out. The session decides what showing one means (a pause),
 * so the domain never learns that training exists.
 *
 * A lesson becomes due the first time its trigger happens, and is shown at most once. Due lessons
 * wait for the right moment: pick-sheet lessons while Recovering, the rest during the fight, and
 * then only once `LESSON_GAP_SECONDS` have passed since the last one let go.
 */
export class LessonDirector {
  private readonly due = new Set<string>();
  private readonly shown = new Set<string>();
  private secondsSinceResume = 0;
  /** Fleet Integrity after the last tick, so a repair can say where it started. */
  private lastIntegrity: number | null = null;
  private lastRepair: { readonly before: number; readonly after: number } | null = null;

  constructor(
    private readonly script: TrainingScript,
    /** The per-cycle fleet damage cap, for `{cap}`. */
    private readonly fleetCycleDamageCap: number,
  ) {}

  /** The opening lessons, due at once and shown back to back before the first tick. */
  start(): void {
    this.latch('TrainingStarted', null);
  }

  /** Events from outside a tick (the next cycle starting after Apply). No game time passes. */
  noteEvents(events: readonly DomainEvent[], view: GameView): void {
    for (const event of events) this.noteEvent(event, view);
  }

  /** One tick's events, and one tick of game time. */
  noteTick(events: readonly DomainEvent[], view: GameView): void {
    this.secondsSinceResume += TICK_SECONDS;
    this.noteEvents(events, view);
    if (isFighting(view)) this.latch('CombatTime', view);
    this.lastIntegrity = view.fleet.integrity;
  }

  /** The fight is running again after a lesson or an Apply: start the gap over. */
  noteResumed(): void {
    this.secondsSinceResume = 0;
  }

  /**
   * The next lesson to show now, or null. `chained` is true when a lesson was just dismissed and
   * the clock is still held, so the next due one can follow without a gap.
   */
  take(view: GameView, chained: boolean): LessonCard | null {
    const phase = view.cycle.phase;
    const recovering = phase === 'recovering';
    if (!recovering && !isFighting(view)) return null;
    if (!recovering && !chained && this.secondsSinceResume < LESSON_GAP_SECONDS) return null;
    const lesson = this.script.lessons.find(
      (candidate) => this.due.has(candidate.id) && (candidate.trigger === 'Recovering') === recovering,
    );
    if (!lesson) return null;
    this.due.delete(lesson.id);
    this.shown.add(lesson.id);
    return {
      id: lesson.id,
      heading: lesson.heading,
      focus: lesson.focus,
      beats: speakBeats(lesson.beats, (text) => this.fill(text)),
      pauses: !recovering,
    };
  }

  /** The recap line of every lesson that never came up, in script order, for the debrief. */
  recaps(): string[] {
    return this.script.lessons
      .filter((lesson) => !this.shown.has(lesson.id) && lesson.recap !== null)
      .map((lesson) => lesson.recap ?? '');
  }

  private noteEvent(event: DomainEvent, view: GameView): void {
    switch (event.type) {
      case 'RaiderDestroyed':
        if (!event.heavy) this.latch('RaiderDestroyed', view);
        return;
      case 'RaiderSpawned':
        if (event.heavy) this.latch('HeavyArrived', view);
        else if (event.returned) this.latch('RaiderReturned', view);
        return;
      case 'ViperHit':
        this.latch('ViperHit', view);
        return;
      case 'ViperEjected':
        this.latch('ViperEjected', view);
        return;
      case 'FleetHit':
        this.latch('FleetHit', view);
        return;
      case 'FleetRepaired':
        this.lastRepair = { before: this.lastIntegrity ?? event.integrity, after: event.integrity };
        return;
      case 'CyclePhaseChanged':
        if (event.phase === 'spooling') this.latch('SpoolStarted', view);
        if (event.phase === 'recovering') this.latch('Recovering', view);
        return;
      case 'ResurrectionShipArrived':
        this.latch('ShipArrived', view);
        return;
      case 'ResurrectionShipExposed':
        this.latch('ShipExposed', view);
        return;
      case 'ResurrectionShipDestroyed':
        this.latch('ShipDestroyed', view);
        return;
      default:
        return;
    }
  }

  /** Marks every not-yet-seen lesson for this trigger due, if its conditions hold right now. */
  private latch(trigger: LessonTrigger, view: GameView | null): void {
    for (const lesson of this.script.lessons) {
      if (lesson.trigger !== trigger || this.due.has(lesson.id) || this.shown.has(lesson.id)) continue;
      if (this.holds(lesson, view)) this.due.add(lesson.id);
    }
  }

  private holds(lesson: Lesson, view: GameView | null): boolean {
    const { cycle, seconds, repaired } = lesson.when;
    if (!view) return cycle === undefined;
    if (cycle !== undefined && view.cycle.cycleIndex !== cycle) return false;
    if (seconds !== undefined && view.cycle.combatElapsedSeconds < seconds) return false;
    if (repaired !== undefined) {
      const didRepair = this.lastRepair !== null && this.lastRepair.after > this.lastRepair.before;
      if (didRepair !== repaired) return false;
    }
    return true;
  }

  private fill(text: string): string {
    return text.replace(/\{(before|after|cap)\}/g, (_match, name: string) => {
      if (name === 'cap') return String(this.fleetCycleDamageCap);
      const repair = this.lastRepair;
      if (!repair) return '?';
      // Whole percent, as the fleet readout shows it.
      return String(Math.round(name === 'before' ? repair.before : repair.after));
    });
  }
}

function isFighting(view: GameView): boolean {
  const phase = view.cycle.phase;
  return phase === 'arriving' || phase === 'building' || phase === 'spooling';
}
