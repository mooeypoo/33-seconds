import { FLEET_LINE_Y_UNITS } from '../../domain/fleet/integrity';
import type { DomainEvent } from '../../domain/shared/events';
import { TICK_SECONDS } from '../../domain/shared/time';
import type { GameView } from '../../domain/views';
import { subjectBox, type LessonSubject } from './lessonFocus';
import { speakBeats, type Lesson, type LessonFocus, type LessonTrigger, type SpokenBeat, type TrainingScript } from './trainingScript';

/**
 * Game seconds after the fight resumes before the next lesson may stop it again. Without it, a kill,
 * a hit, and a fleet hit in one second would be three pauses and three 3-2-1s in a row.
 * ASSUMPTION: 3 s, until someone plays it.
 */
export const LESSON_GAP_SECONDS = 3;

/**
 * How far above the fleet line a stray round is "about to hit" (world units). At 200 units a second
 * that is about a sixth of a second, so the round lands just after the 3-2-1: the lesson can say
 * "watch what happens" and the next thing the player sees is the fleet taking it.
 */
export const STRAY_NEAR_FLEET_UNITS = 30;

/** A lesson as the overlay shows it, placeholders filled. */
export interface LessonCard {
  readonly id: string;
  readonly heading: string;
  readonly focus: readonly LessonFocus[];
  /**
   * What the lesson is about in the playfield, which the card keeps clear of and `subject` rings.
   * Null when there is none, or when a lesson shown at its deadline has nothing to point at.
   */
  readonly subject: LessonSubject | null;
  /** The drill to start when this lesson is read, or null. */
  readonly startsDrill: string | null;
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
  /** Due because the deadline passed, not because it happened: shown with the fallback lines. */
  private readonly late = new Set<string>();
  private readonly shown = new Set<string>();
  /** What each due lesson is about, when its trigger names one thing. */
  private readonly subjects = new Map<string, LessonSubject>();
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
    if (isFighting(view)) {
      this.latch('CombatTime', view);
      this.latchSubjects(view);
      this.latchOverdue(view);
    }
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
    // Inside the gap after a resume, only a lesson that must catch its moment may break in.
    const inGap = !recovering && !chained && this.secondsSinceResume < LESSON_GAP_SECONDS;
    const lesson = this.script.lessons.find(
      (candidate) =>
        this.due.has(candidate.id) && (candidate.trigger === 'Recovering') === recovering && (!inGap || candidate.interrupt),
    );
    if (!lesson) return null;
    this.due.delete(lesson.id);
    this.shown.add(lesson.id);
    return {
      id: lesson.id,
      heading: lesson.heading,
      focus: lesson.focus,
      subject: this.subjectNow(lesson, view),
      startsDrill: lesson.startsDrill,
      beats: speakBeats(this.late.has(lesson.id) ? (lesson.fallback ?? lesson.beats) : lesson.beats, (text) =>
        this.fill(text),
      ),
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
        // Where it died is where its blip downloads.
        if (!event.heavy) this.latch('RaiderDestroyed', view, { kind: 'point', x: event.x, y: event.y });
        return;
      case 'RaiderSpawned':
        if (event.heavy) this.latch('HeavyArrived', view, { kind: 'raider', id: event.id });
        else if (event.returned) this.latch('RaiderReturned', view, { kind: 'raider', id: event.id });
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
  private latch(trigger: LessonTrigger, view: GameView | null, subject: LessonSubject | null = null): void {
    for (const lesson of this.script.lessons) {
      if (lesson.trigger !== trigger || this.due.has(lesson.id) || this.shown.has(lesson.id)) continue;
      if (!this.holds(lesson, view)) continue;
      this.due.add(lesson.id);
      if (subject) this.subjects.set(lesson.id, subject);
    }
  }

  /** Triggers read from what is on screen, not from an event: each is about one round or Raider. */
  private latchSubjects(view: GameView): void {
    const stray = strayNearFleet(view);
    if (stray) this.latch('StrayNearFleet', view, stray);
    const strafer = diving(view);
    if (strafer) this.latch('StrafeFlagged', view, strafer);
  }

  /**
   * What the lesson points at as it shows. A lesson can wait out the gap after its moment, and the
   * Raider that dived first may be gone by then; any Raider diving now makes the same point.
   */
  private subjectNow(lesson: Lesson, view: GameView): LessonSubject | null {
    const latched = this.subjects.get(lesson.id) ?? standingSubject(lesson.trigger);
    if (lesson.trigger !== 'StrafeFlagged' || (latched && subjectBox(latched, view))) return latched;
    return diving(view);
  }

  /** A lesson whose moment has not come by its deadline is due anyway, with its fallback lines. */
  private latchOverdue(view: GameView): void {
    const { cycleIndex, combatElapsedSeconds } = view.cycle;
    for (const lesson of this.script.lessons) {
      const by = lesson.by;
      if (!by || this.due.has(lesson.id) || this.shown.has(lesson.id)) continue;
      const overdue = cycleIndex > by.cycle || (cycleIndex === by.cycle && combatElapsedSeconds >= by.seconds);
      if (!overdue) continue;
      this.due.add(lesson.id);
      this.late.add(lesson.id);
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

function strayNearFleet(view: GameView): LessonSubject | null {
  const shot = view.projectiles.find(
    (candidate) => candidate.stray && candidate.y < FLEET_LINE_Y_UNITS && candidate.y >= FLEET_LINE_Y_UNITS - STRAY_NEAR_FLEET_UNITS,
  );
  return shot ? { kind: 'shot', id: shot.id } : null;
}

function diving(view: GameView): LessonSubject | null {
  const raider = view.raiders.find((candidate) => candidate.strafing);
  return raider ? { kind: 'raider', id: raider.id } : null;
}

/**
 * The subject of a trigger that is always on screen, so a lesson shown at its deadline can point at
 * it too: the Viper for its hull and the eject, the resurrection ship for its own lessons.
 */
function standingSubject(trigger: LessonTrigger): LessonSubject | null {
  switch (trigger) {
    case 'ViperHit':
    case 'ViperEjected':
      return { kind: 'viper' };
    case 'ShipArrived':
    case 'ShipExposed':
    case 'ShipDestroyed':
      return { kind: 'ship' };
    default:
      return null;
  }
}

function isFighting(view: GameView): boolean {
  const phase = view.cycle.phase;
  return phase === 'arriving' || phase === 'building' || phase === 'spooling';
}
