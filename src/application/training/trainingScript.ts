import raw from '../../content/training.json';
import { isSpeaker, speakerName, type BanterSpeaker } from '../banter/lines';

/**
 * The Training Run's lessons (PRD 5.5, CONTENT-SCHEMA 6c): what Tyrol says, and when. Rewriting a
 * lesson, reordering them, or adding one is an edit to `content/training.json`. The loader drops a
 * bad lesson quietly, like every other content loader; `check:content` names it instead.
 */

/** What makes a lesson due. Each fires a lesson at most once per training run. */
export const LESSON_TRIGGERS = [
  /** Launch, before the first tick. These are shown back to back while the clock is held. */
  'TrainingStarted',
  /** `when.seconds` into a cycle's fight (and `when.cycle`, if given). */
  'CombatTime',
  /** The first Raider destroyed (not a heavy). */
  'RaiderDestroyed',
  /** The first Raider that comes back marked Returned. */
  'RaiderReturned',
  'HeavyArrived',
  'ViperHit',
  'ViperEjected',
  'FleetHit',
  'SpoolStarted',
  /** The pick sheet is up. These lessons sit over it and do not pause (PRD 13.3). */
  'Recovering',
  'ShipArrived',
  'ShipExposed',
  'ShipDestroyed',
] as const;

export type LessonTrigger = (typeof LESSON_TRIGGERS)[number];

/**
 * Triggers that may never happen in a given run (a careful pilot is never hit), so a lesson on them
 * can carry a deadline. The others always happen at a known moment, or are the deadline themselves.
 */
const DEADLINE_TRIGGERS: readonly LessonTrigger[] = [
  'RaiderDestroyed',
  'RaiderReturned',
  'HeavyArrived',
  'ViperHit',
  'ViperEjected',
  'FleetHit',
  'ShipArrived',
  'ShipExposed',
  'ShipDestroyed',
];

/** A moment in the run: `seconds` into the fight of `cycle`. */
export interface LessonDeadline {
  readonly cycle: number;
  readonly seconds: number;
}

/** HUD elements a lesson can outline. Each is marked with `data-lesson-target` in both layouts. */
export const LESSON_FOCUS = ['clock', 'fleet', 'status', 'objective'] as const;

export type LessonFocus = (typeof LESSON_FOCUS)[number];

/** Filled when the lesson is shown. `before` and `after` are the last jump's repair. */
export const LESSON_PLACEHOLDERS = ['before', 'after', 'cap'] as const;

/**
 * Writing limits, enforced by `check:content`. The loader does not drop a lesson for running long
 * (a writer's longer line must never make a lesson vanish from play); it only caps absurd sizes.
 */
export const LESSON_BEAT_MAX_CHARACTERS = 200;
export const LESSON_HEADING_MAX_CHARACTERS = 28;
export const LESSON_RECAP_MAX_CHARACTERS = 140;
export const LESSON_MAX_BEATS = 4;
export const LESSON_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
/** Past this, the text is not a line anyone wrote on purpose. */
const LOADER_MAX_CHARACTERS = 1000;

export interface LessonBeat {
  readonly speaker: BanterSpeaker;
  readonly text: string;
}

export interface LessonConditions {
  /** Only in this cycle (1-based). */
  readonly cycle?: number;
  /** `CombatTime` only: seconds into the fight. */
  readonly seconds?: number;
  /** `Recovering` only: true when the jump actually repaired something. */
  readonly repaired?: boolean;
}

export interface Lesson {
  readonly id: string;
  readonly trigger: LessonTrigger;
  readonly when: LessonConditions;
  readonly heading: string;
  readonly focus: LessonFocus | null;
  readonly beats: readonly LessonBeat[];
  /** One line for the debrief when the lesson never came up. Null when it always will. */
  readonly recap: string | null;
  /**
   * If the trigger has not happened by this moment, the lesson shows anyway with `fallback`, so
   * every player sees it in a known window (PRD 5.5). Null means it waits for the real thing.
   */
  readonly by: LessonDeadline | null;
  /** The lines for a lesson shown at its deadline, worded for something that has not happened. */
  readonly fallback: readonly LessonBeat[] | null;
}

export interface TrainingDebriefScript {
  readonly heading: string;
  readonly beats: readonly LessonBeat[];
  readonly recapIntro: string;
  readonly grades: readonly string[];
}

export interface TrainingScript {
  readonly lessons: readonly Lesson[];
  readonly debrief: TrainingDebriefScript;
}

/** A beat as the overlay shows it: the display name, which is also the portrait key. */
export interface SpokenBeat {
  readonly speakerName: string;
  readonly text: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isTrigger(value: unknown): value is LessonTrigger {
  return typeof value === 'string' && (LESSON_TRIGGERS as readonly string[]).includes(value);
}

function isFocus(value: unknown): value is LessonFocus {
  return typeof value === 'string' && (LESSON_FOCUS as readonly string[]).includes(value);
}

/** Plain text, not empty, within the limit, and only placeholders the lesson can fill. */
export function isPlainText(value: unknown, maxCharacters: number, allowPlaceholders: boolean): value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxCharacters) return false;
  if (value.includes('<') || value.includes('>')) return false;
  for (const match of value.matchAll(/\{([^}]*)\}/g)) {
    if (!allowPlaceholders) return false;
    if (!(LESSON_PLACEHOLDERS as readonly string[]).includes(match[1] ?? '')) return false;
  }
  return true;
}

function parseBeats(value: unknown, allowPlaceholders: boolean): LessonBeat[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > LESSON_MAX_BEATS) return null;
  const beats: LessonBeat[] = [];
  for (const entry of value) {
    const beat = record(entry);
    if (!beat || !isSpeaker(beat.speaker)) return null;
    if (!isPlainText(beat.text, LOADER_MAX_CHARACTERS, allowPlaceholders)) return null;
    beats.push({ speaker: beat.speaker, text: beat.text });
  }
  return beats;
}

function parseConditions(trigger: LessonTrigger, value: unknown): LessonConditions | null {
  if (value === undefined) return trigger === 'CombatTime' ? null : {};
  const when = record(value);
  if (!when) return null;
  const conditions: { cycle?: number; seconds?: number; repaired?: boolean } = {};
  for (const [key, entry] of Object.entries(when)) {
    if (key === 'cycle' && typeof entry === 'number' && Number.isInteger(entry) && entry >= 1) conditions.cycle = entry;
    else if (key === 'seconds' && trigger === 'CombatTime' && typeof entry === 'number' && entry >= 0 && entry < 33) {
      conditions.seconds = entry;
    } else if (key === 'repaired' && trigger === 'Recovering' && typeof entry === 'boolean') conditions.repaired = entry;
    else return null;
  }
  if (trigger === 'CombatTime' && conditions.seconds === undefined) return null;
  return conditions;
}

function parseDeadline(value: unknown): LessonDeadline | null {
  const by = record(value);
  if (!by || Object.keys(by).some((key) => key !== 'cycle' && key !== 'seconds')) return null;
  const { cycle, seconds } = by;
  if (typeof cycle !== 'number' || !Number.isInteger(cycle) || cycle < 1) return null;
  if (typeof seconds !== 'number' || seconds < 0 || seconds >= 33) return null;
  return { cycle, seconds };
}

/** One lesson, or null when anything about it is wrong. */
export function parseLesson(value: unknown): Lesson | null {
  const lesson = record(value);
  if (!lesson) return null;
  if (typeof lesson.id !== 'string' || !LESSON_ID_PATTERN.test(lesson.id)) return null;
  if (!isTrigger(lesson.trigger)) return null;
  const when = parseConditions(lesson.trigger, lesson.when);
  if (!when) return null;
  if (!isPlainText(lesson.heading, LOADER_MAX_CHARACTERS, false)) return null;
  if (lesson.focus !== undefined && !isFocus(lesson.focus)) return null;
  // Opening lessons always show, so a recap for them would never be read.
  if (lesson.recap !== undefined && (lesson.trigger === 'TrainingStarted' || !isPlainText(lesson.recap, LOADER_MAX_CHARACTERS, false))) {
    return null;
  }
  const beats = parseBeats(lesson.beats, true);
  if (!beats) return null;
  // A deadline and its fallback lines come as a pair, and only on a trigger that can fail to happen.
  if ((lesson.by === undefined) !== (lesson.fallback === undefined)) return null;
  let by: LessonDeadline | null = null;
  let fallback: LessonBeat[] | null = null;
  if (lesson.by !== undefined) {
    if (!DEADLINE_TRIGGERS.includes(lesson.trigger)) return null;
    by = parseDeadline(lesson.by);
    fallback = parseBeats(lesson.fallback, true);
    if (!by || !fallback) return null;
  }
  return {
    id: lesson.id,
    trigger: lesson.trigger,
    when,
    heading: lesson.heading,
    focus: lesson.focus ?? null,
    beats,
    recap: typeof lesson.recap === 'string' ? lesson.recap : null,
    by,
    fallback,
  };
}

const EMPTY_DEBRIEF: TrainingDebriefScript = { heading: 'Sim complete', beats: [], recapIntro: '', grades: [] };

function parseDebrief(value: unknown): TrainingDebriefScript {
  const debrief = record(value);
  if (!debrief) return EMPTY_DEBRIEF;
  const grades = Array.isArray(debrief.grades)
    ? debrief.grades.filter((grade) => isPlainText(grade, LOADER_MAX_CHARACTERS, false))
    : [];
  return {
    heading: isPlainText(debrief.heading, LOADER_MAX_CHARACTERS, false) ? debrief.heading : EMPTY_DEBRIEF.heading,
    beats: parseBeats(debrief.beats, false) ?? [],
    recapIntro: isPlainText(debrief.recapIntro, LOADER_MAX_CHARACTERS, false) ? debrief.recapIntro : '',
    grades,
  };
}

/** Keeps every good lesson in file order and drops the rest, including a repeated id. */
export function parseTrainingScript(value: unknown): TrainingScript {
  const script = record(value);
  const lessons: Lesson[] = [];
  const seen = new Set<string>();
  const rawLessons = Array.isArray(script?.lessons) ? script.lessons : [];
  for (const entry of rawLessons) {
    const lesson = parseLesson(entry);
    if (!lesson || seen.has(lesson.id)) continue;
    seen.add(lesson.id);
    lessons.push(lesson);
  }
  return { lessons, debrief: parseDebrief(script?.debrief) };
}

/** For `check:content`: whether a lesson on this trigger may carry `by` and `fallback`. */
export function canHaveDeadline(trigger: unknown): boolean {
  return (DEADLINE_TRIGGERS as readonly unknown[]).includes(trigger);
}

export function speakBeats(beats: readonly LessonBeat[], fill: (text: string) => string = (text) => text): SpokenBeat[] {
  return beats.map((beat) => ({ speakerName: speakerName(beat.speaker), text: fill(beat.text) }));
}

export const TRAINING_SCRIPT: TrainingScript = parseTrainingScript(raw);
