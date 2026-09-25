import { beforeEach, describe, expect, it } from 'vitest';
import { GameSession, RESUME_COUNTDOWN_SECONDS } from '../src/application/GameSession';
import type { InputPort } from '../src/application/ports/InputPort';
import { LESSON_GAP_SECONDS, STRAY_NEAR_FLEET_UNITS, type LessonSubject } from '../src/application/training/LessonDirector';
import { TRAINING_SCRIPT } from '../src/application/training/trainingScript';
import { TRAINING_PRESET } from '../src/balance/training';
import { FLEET_LINE_Y_UNITS } from '../src/domain/fleet/integrity';
import type { DomainEvent } from '../src/domain/shared/events';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

/**
 * The Training Run (PRD 5.5): lessons that hold the clock, a pick sheet that is never paused, and a
 * debrief instead of a score. Everything goes through the session, the way the overlay drives it.
 */
class FakeInput implements InputPort {
  intent: InputIntent = IDLE_INTENT;

  readIntent(): InputIntent {
    return this.intent;
  }

  clear(): void {
    this.intent = IDLE_INTENT;
  }
}

const OPENING_IDS = TRAINING_SCRIPT.lessons.filter((lesson) => lesson.trigger === 'TrainingStarted').map((lesson) => lesson.id);

let input: FakeInput;
let session: GameSession;

beforeEach(() => {
  input = new FakeInput();
  session = new GameSession(input, { seed: 1 });
});

function runFrames(count: number): number {
  let ticks = 0;
  for (let i = 0; i < count; i++) ticks += session.advance(TICK_SECONDS).ticksAdvanced;
  return ticks;
}

/** Dismisses every lesson already up and returns their ids, in the order they were shown. */
function dismissAll(): string[] {
  const ids: string[] = [];
  while (session.status.lesson) {
    ids.push(session.status.lesson.id);
    session.dismissLesson();
  }
  return ids;
}

/** Fly under the resurrection ship once it can be hurt, otherwise under the nearest Raider. */
function steer(): void {
  const view = session.view;
  const ship = view.resurrectionShip;
  const raider = view.raiders.find((body) => !body.protected) ?? view.raiders[0];
  const targetX = ship && !ship.destroyed && !ship.shielded ? ship.x : (raider?.x ?? view.worldWidth / 2);
  const scaled = (targetX - view.viper.x) / 20;
  input.intent = { ...IDLE_INTENT, moveX: Math.max(-1, Math.min(1, scaled)), moveY: 0 };
}

interface Shown {
  readonly id: string;
  readonly tick: number;
  readonly cycle: number;
  /** Seconds into that cycle's fight. */
  readonly seconds: number;
  readonly pauses: boolean;
  /** Came up right after another was dismissed, with the clock still held. */
  readonly chained: boolean;
  /** Game ticks since the fight last resumed. */
  readonly ticksSinceResume: number;
  readonly text: string;
  readonly integrity: number;
  readonly lastCycleDamage: number;
  readonly subject: LessonSubject | null;
  /** The drill name in the status row while the lesson was up. */
  readonly drill: string | null;
}

/**
 * Plays a whole Training Run the way a player would: read every lesson, take the first card, fly
 * at things. Checks on every lesson that the clock really is held while it is up.
 */
function playTraining(maxSeconds = 600): Shown[] {
  const shown: Shown[] = [];
  let resumedAtTick = 0;
  let wasCounting = false;
  let chained = false;
  for (let frame = 0; frame < maxSeconds * TICKS_PER_SECOND; frame++) {
    const status = session.status;
    if (status.phase === 'won' || status.phase === 'lost') break;
    if (status.lesson) {
      const view = session.view;
      shown.push({
        id: status.lesson.id,
        tick: view.tickCount,
        cycle: view.cycle.cycleIndex,
        seconds: view.cycle.combatElapsedSeconds,
        pauses: status.lesson.pauses,
        chained,
        ticksSinceResume: view.tickCount - resumedAtTick,
        text: status.lesson.beats.map((beat) => beat.text).join(' '),
        integrity: view.fleet.integrity,
        lastCycleDamage: view.fleet.lastCycleDamage,
        subject: status.lesson.subject,
        drill: status.drill,
      });
      if (status.lesson.pauses) {
        expect(status.phase).toBe('paused');
        expect(status.pauseReason).toBe('lesson');
        expect(runFrames(5)).toBe(0);
      }
      session.dismissLesson();
      chained = session.status.lesson !== null;
      continue;
    }
    chained = false;
    if (status.choosingUpgrade) {
      const cardId = session.view.upgradeOffer?.cardIds[0];
      if (cardId) session.pickUpgrade(cardId);
      continue;
    }
    const counting = status.phase === 'resuming';
    steer();
    session.advance(TICK_SECONDS);
    if (wasCounting && session.status.phase === 'running') resumedAtTick = session.view.tickCount;
    wasCounting = counting || session.status.phase === 'resuming';
  }
  return shown;
}

describe('the Training Run opening', () => {
  it('holds the clock through the opening lessons, in script order, and only then counts 3-2-1', () => {
    session.startTraining();

    expect(session.status.training).toBe(true);
    expect(session.status.phase).toBe('paused');
    expect(session.status.pauseReason).toBe('lesson');
    expect(runFrames(120)).toBe(0);

    const ids: string[] = [];
    while (session.status.lesson) {
      ids.push(session.status.lesson.id);
      session.dismissLesson();
      expect(session.view.tickCount).toBe(0);
    }

    expect(ids).toEqual(OPENING_IDS);
    expect(session.status.phase).toBe('resuming');
    expect(runFrames(RESUME_COUNTDOWN_SECONDS * TICKS_PER_SECOND - 1)).toBe(0);
    runFrames(2);
    expect(session.status.phase).toBe('running');
    expect(runFrames(10)).toBe(10);
  });

  it('treats Esc on a lesson as Got it, and an automatic pause does not replace the lesson', () => {
    session.startTraining();
    const first = session.status.lesson?.id;

    session.pause('tab-hidden');
    expect(session.status.pauseReason).toBe('lesson');
    expect(session.status.lesson?.id).toBe(first);

    session.requestResume();
    expect(session.status.phase).toBe('paused');
    expect(session.status.lesson?.id).toBe(OPENING_IDS[1]);
  });

  it('abandons from a lesson, and the next Launch is a real run with no lessons', () => {
    session.startTraining();
    session.abandonRun();

    expect(session.status.phase).toBe('title');
    expect(session.status.lesson).toBeNull();
    expect(session.status.training).toBe(false);

    session.start();
    expect(session.status.phase).toBe('running');
    expect(runFrames(TICKS_PER_SECOND * 20)).toBe(TICKS_PER_SECOND * 20);
    expect(session.status.lesson).toBeNull();
    expect(session.status.training).toBe(false);
  });
});

describe('lessons during the fight', () => {
  it('shows each lesson at most once, never inside the gap after a resume, and ends on a debrief', () => {
    session.startTraining();
    const shown = playTraining();
    const ids = shown.map((entry) => entry.id);

    expect(session.status.phase).toBe('won');
    expect(new Set(ids).size).toBe(ids.length);
    const gapTicks = Math.round(LESSON_GAP_SECONDS * TICKS_PER_SECOND);
    const interrupting = new Set(TRAINING_SCRIPT.lessons.filter((lesson) => lesson.interrupt).map((lesson) => lesson.id));
    for (const entry of shown) {
      if (entry.pauses && !entry.chained && entry.tick > 0 && !interrupting.has(entry.id)) {
        expect(entry.ticksSinceResume, entry.id).toBeGreaterThanOrEqual(gapTicks);
      }
    }
    // The preset reached the game: the ship lesson comes in the preset's cycle.
    expect(shown.find((entry) => entry.id === 'sim-ship-arrived')?.cycle).toBe(TRAINING_PRESET.resurrectionShipArrivesCycle);
    // Lessons follow the script order among those that came due together.
    expect(ids.slice(0, OPENING_IDS.length)).toEqual(OPENING_IDS);

    const debrief = session.status.debrief;
    expect(session.status.result).toBeNull();
    expect(debrief?.outcome).toBe('won');
    expect(TRAINING_SCRIPT.debrief.grades).toContain(debrief?.grade);
    const expectedRecaps = TRAINING_SCRIPT.lessons
      .filter((lesson) => lesson.recap !== null && !ids.includes(lesson.id))
      .map((lesson) => lesson.recap);
    expect(debrief?.recaps).toEqual(expectedRecaps);

    session.returnToTitle();
    expect(session.status.debrief).toBeNull();
    expect(session.status.training).toBe(false);
  });

  it('shows a lesson whose moment never came at its deadline, with its fallback lines and nothing outlined', () => {
    // Raiders that never fire cannot hit the Viper or send a stray, so those lessons only have deadlines.
    session = new GameSession(input, { seed: 1, raidersFire: false });
    session.startTraining();
    const shown = playTraining();
    const late = TRAINING_SCRIPT.lessons.filter((lesson) =>
      ['ViperHit', 'ViperEjected', 'StrayNearFleet'].includes(lesson.trigger),
    );

    expect(session.status.phase).toBe('won');
    expect(late.length).toBeGreaterThan(0);
    for (const lesson of late) {
      const entry = shown.find((candidate) => candidate.id === lesson.id);
      const by = lesson.by;
      expect(by, `${lesson.id} needs a deadline`).not.toBeNull();
      expect(entry, `${lesson.id} should show`).toBeDefined();
      if (!entry || !by) continue;
      expect(entry.text).toBe(lesson.fallback?.map((beat) => beat.text).join(' '));
      expect(entry.subject).toBeNull();
      const reached = entry.cycle > by.cycle || entry.seconds >= by.seconds;
      expect(reached, `${lesson.id} came before its deadline`).toBe(true);
    }
    expect(session.status.debrief?.recaps).toEqual(
      TRAINING_SCRIPT.lessons.filter((lesson) => lesson.recap !== null && !shown.some((entry) => entry.id === lesson.id)).map((lesson) => lesson.recap),
    );
  });

  it('uses the real lines when the moment comes before the deadline', () => {
    const hull = TRAINING_SCRIPT.lessons.find((lesson) => lesson.trigger === 'ViperHit');
    const by = hull?.by;
    if (!hull || !by) throw new Error('the hull lesson needs a deadline');
    let early = 0;
    for (const seed of [1, 2, 3, 5]) {
      input = new FakeInput();
      session = new GameSession(input, { seed });
      session.startTraining();
      const entry = playTraining().find((candidate) => candidate.id === hull.id);
      if (!entry || entry.cycle > by.cycle || entry.seconds >= by.seconds) continue;
      early += 1;
      expect(entry.text).toBe(hull.beats.map((beat) => beat.text).join(' '));
    }
    expect(early).toBeGreaterThan(0);
  });

  it('shows every lesson with a deadline in every run', () => {
    const withDeadline = TRAINING_SCRIPT.lessons.filter((lesson) => lesson.by !== null).map((lesson) => lesson.id);
    expect(withDeadline.length).toBeGreaterThan(0);
    for (const options of [{ seed: 2 }, { seed: 5, raidersFire: false }]) {
      input = new FakeInput();
      session = new GameSession(input, options);
      session.startTraining();
      const ids = playTraining().map((entry) => entry.id);
      expect(withDeadline.filter((id) => !ids.includes(id))).toEqual([]);
    }
  });

  it('stops on the tick a lesson came due, even when a slow frame runs several ticks', () => {
    /** The tick the first fight lesson appears at, with frames of the given length. */
    function firstFightLessonTick(frameSeconds: number): number {
      input = new FakeInput();
      session = new GameSession(input, { seed: 3 });
      session.startTraining();
      dismissAll();
      for (let frame = 0; frame < 60 * TICKS_PER_SECOND; frame++) {
        if (session.status.lesson) return session.view.tickCount;
        session.advance(frameSeconds);
      }
      throw new Error('no lesson came up');
    }

    expect(firstFightLessonTick(TICK_SECONDS * 3)).toBe(firstFightLessonTick(TICK_SECONDS));
  });

  it('says the real repair numbers, and only when the jump repaired something', () => {
    session.startTraining();
    const shown = playTraining();
    const repairs = shown.filter((entry) => entry.id === 'sim-repair');

    expect(repairs.length).toBeLessThanOrEqual(1);
    const repair = repairs[0];
    if (repair) {
      expect(repair.lastCycleDamage).toBeGreaterThan(0);
      expect(repair.text).toContain(`to ${String(Math.round(repair.integrity))}%`);
      const before = Number(/from (\d+)%/.exec(repair.text)?.[1]);
      expect(before).toBeLessThan(repair.integrity);
    } else {
      // Never came up, so the debrief carries it instead.
      expect(session.status.debrief?.recaps).toContain(TRAINING_SCRIPT.lessons.find((lesson) => lesson.id === 'sim-repair')?.recap);
    }
  });

  it('keeps its hands off a real run: no lessons, a scored end screen', () => {
    session = new GameSession(input, {
      seed: 1,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
      resurrectionShipHitPoints: 1,
    });
    session.start('civilian-ship');
    const shown = playTraining(120);

    expect(shown).toEqual([]);
    expect(session.status.phase).toBe('won');
    expect(session.status.debrief).toBeNull();
    expect(session.status.result?.outcome).toBe('won');
  });
});

describe('drills', () => {
  const firstKill = TRAINING_SCRIPT.lessons.find((lesson) => lesson.trigger === 'RaiderDestroyed');
  const strayLesson = TRAINING_SCRIPT.lessons.find((lesson) => lesson.trigger === 'StrayNearFleet');

  /** Runs the fight, reading every lesson, until `stop` says so. Returns the events on the way. */
  function playUntil(stop: () => boolean, maxSeconds = 60): DomainEvent[] {
    const events: DomainEvent[] = [];
    for (let frame = 0; frame < maxSeconds * TICKS_PER_SECOND; frame++) {
      if (stop()) return events;
      if (session.status.lesson) {
        session.dismissLesson();
        continue;
      }
      steer();
      events.push(...session.advance(TICK_SECONDS).events);
    }
    throw new Error('never got there');
  }

  it('starts with one drone that never fires, and live fire begins only once the first kill is read', () => {
    session.startTraining();
    expect(session.status.drill).toBe(TRAINING_SCRIPT.drillNames[TRAINING_PRESET.firstDrill]);
    let most = 0;
    const practice = playUntil(() => {
      most = Math.max(most, session.view.raiders.length);
      return session.status.lesson?.id === firstKill?.id;
    });

    expect(most).toBe(1);
    expect(practice.some((event) => event.type === 'ShotFired' && event.owner === 'cylon')).toBe(false);
    expect(session.status.drill).toBe(TRAINING_SCRIPT.drillNames[TRAINING_PRESET.firstDrill]);

    const next = firstKill?.startsDrill ?? '';
    session.dismissLesson();
    expect(session.status.drill).toBe(TRAINING_SCRIPT.drillNames[next]);
    // Same cycle: the drill changed on the read, not at a jump.
    const live = playUntil(() => session.view.projectiles.some((shot) => shot.owner === 'cylon'), 10);
    expect(live.some((event) => event.type === 'ShotFired' && event.owner === 'cylon')).toBe(true);
    expect(session.view.cycle.cycleIndex).toBe(1);
  });

  it('stops on a stray a moment from the fleet, outlines it, and the fleet takes it right after', () => {
    for (const seed of [1, 3, 5]) {
      input = new FakeInput();
      session = new GameSession(input, { seed });
      session.startTraining();
      playUntil(() => session.status.lesson?.id === strayLesson?.id);

      const card = session.status.lesson;
      expect(session.status.phase).toBe('paused');
      expect(card?.focus).toContain('subject');
      const round = session.view.projectiles.find((shot) => card?.subject?.kind === 'shot' && shot.id === card.subject.id);
      expect(round?.stray, `seed ${String(seed)}`).toBe(true);
      expect(round?.y).toBeLessThan(FLEET_LINE_Y_UNITS);
      expect(round?.y).toBeGreaterThanOrEqual(FLEET_LINE_Y_UNITS - STRAY_NEAR_FLEET_UNITS);

      const integrity = session.view.fleet.integrity;
      while (session.status.lesson) session.dismissLesson();
      runFrames(RESUME_COUNTDOWN_SECONDS * TICKS_PER_SECOND + 1);
      const events: DomainEvent[] = [];
      for (let frame = 0; frame < TICKS_PER_SECOND / 2; frame++) events.push(...session.advance(TICK_SECONDS).events);
      expect(events.some((event) => event.type === 'FleetHit' && event.kind === 'stray')).toBe(true);
      expect(session.view.fleet.integrity).toBeLessThan(integrity);
    }
  });
});

describe('lessons over the pick sheet', () => {
  /** Plays until the first lesson that sits over the pick sheet is up. */
  function reachSheetLesson(): void {
    for (let frame = 0; frame < 120 * TICKS_PER_SECOND; frame++) {
      const lesson = session.status.lesson;
      if (lesson && !lesson.pauses) return;
      if (lesson) {
        session.dismissLesson();
        continue;
      }
      steer();
      session.advance(TICK_SECONDS);
    }
    throw new Error('no pick-sheet lesson came up');
  }

  it('does not pause the sheet, and holds the pick and the reroll until the lesson is read', () => {
    session.startTraining();
    reachSheetLesson();

    expect(session.status.phase).toBe('running');
    expect(session.status.choosingUpgrade).toBe(true);
    const offer = session.view.upgradeOffer?.cardIds ?? [];
    const cardId = offer[0] ?? '';

    session.pickUpgrade(cardId);
    session.rerollOffer();
    session.pause('player');
    expect(session.status.phase).toBe('running');
    expect(session.view.upgradeOffer?.cardIds).toEqual(offer);
    expect(session.status.lesson).not.toBeNull();

    const ids = dismissAll();
    expect(ids).toContain('sim-cards');
    expect(session.status.phase).toBe('running');
    expect(session.status.choosingUpgrade).toBe(true);

    session.pickUpgrade(cardId);
    expect(session.status.phase).toBe('resuming');
  });
});
