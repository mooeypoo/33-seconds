import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameSession,
  MAX_CATCH_UP_TICKS,
  MAX_FRAME_SECONDS,
  RESUME_COUNTDOWN_SECONDS,
  type PauseReason,
} from '../src/application/GameSession';
import type { InputPort } from '../src/application/ports/InputPort';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICK_SECONDS } from '../src/domain/shared/time';

/** A stand-in for the keyboard and stick adapters, so we can watch what the session asks of them. */
class FakeInput implements InputPort {
  intent: InputIntent = IDLE_INTENT;
  reads = 0;
  clears = 0;

  readIntent(): InputIntent {
    this.reads += 1;
    return this.intent;
  }

  clear(): void {
    this.clears += 1;
    this.intent = IDLE_INTENT;
  }
}

const ONE_FRAME_AT_60HZ = TICK_SECONDS;

let input: FakeInput;
let session: GameSession;

beforeEach(() => {
  input = new FakeInput();
  session = new GameSession(input);
});

function runFrames(count: number, frameSeconds = ONE_FRAME_AT_60HZ): number {
  let ticks = 0;
  for (let i = 0; i < count; i++) ticks += session.advance(frameSeconds).ticksAdvanced;
  return ticks;
}

describe('the loop', () => {
  it('does not touch the domain before the player starts', () => {
    const ticks = runFrames(60);

    expect(ticks).toBe(0);
    expect(session.view.tickCount).toBe(0);
    expect(input.reads).toBe(0);
  });

  it('runs one tick per frame at 60 Hz', () => {
    session.start();

    const ticks = runFrames(60);

    expect(ticks).toBe(60);
    expect(session.view.tickCount).toBe(60);
  });

  it('keeps simulated time honest on a 144 Hz screen', () => {
    session.start();
    const frameSeconds = 1 / 144;

    runFrames(144, frameSeconds);

    // One second of real time is 60 ticks whatever the refresh rate, give or take the tick the
    // accumulator is part-way through.
    expect(session.view.tickCount).toBeGreaterThanOrEqual(59);
    expect(session.view.tickCount).toBeLessThanOrEqual(60);
  });

  it('runs several ticks in one long frame, but never more than the catch-up limit', () => {
    session.start();

    // Ten ticks' worth of time arriving in a single frame.
    const frame = session.advance(TICK_SECONDS * 10);

    expect(frame.ticksAdvanced).toBe(MAX_CATCH_UP_TICKS);
  });

  it('slows down instead of spiralling when frames stay slow', () => {
    session.start();

    // Twenty slow frames, each carrying ten ticks of work. A spiral would keep a growing backlog.
    for (let i = 0; i < 20; i++) session.advance(TICK_SECONDS * 10);
    const caughtUpTicks = session.advance(ONE_FRAME_AT_60HZ).ticksAdvanced;

    expect(session.view.tickCount).toBeLessThanOrEqual(20 * MAX_CATCH_UP_TICKS + 1);
    expect(caughtUpTicks).toBeLessThanOrEqual(MAX_CATCH_UP_TICKS);
  });

  it('discards a stalled frame rather than fast-forwarding the game', () => {
    session.start();

    // A breakpoint, a long garbage-collection pause, or a tab that came back.
    const frame = session.advance(30);

    expect(frame.ticksAdvanced).toBe(MAX_CATCH_UP_TICKS);
    expect(session.advance(0).ticksAdvanced).toBe(0);
  });

  it('ignores nonsense frame times', () => {
    session.start();

    expect(session.advance(Number.NaN).ticksAdvanced).toBe(0);
    expect(session.advance(-5).ticksAdvanced).toBe(0);
    expect(session.view.tickCount).toBe(0);
  });

  it('reports where the frame sits between ticks, for interpolation', () => {
    session.start();

    const frame = session.advance(TICK_SECONDS * 1.5);

    expect(frame.ticksAdvanced).toBe(1);
    expect(frame.interpolationAlpha).toBeCloseTo(0.5, 6);
  });

  it('caps a frame at the stall limit', () => {
    session.start();
    session.advance(MAX_FRAME_SECONDS * 4);

    // Whatever arrived, it was clamped, so no more than the catch-up limit ran.
    expect(session.view.tickCount).toBe(MAX_CATCH_UP_TICKS);
  });
});

describe('pause', () => {
  it('freezes the simulation while paused', () => {
    session.start();
    runFrames(10);
    const ticksBeforePause = session.view.tickCount;

    session.pause('player');
    const ticksDuringPause = runFrames(600);

    expect(ticksDuringPause).toBe(0);
    expect(session.view.tickCount).toBe(ticksBeforePause);
    expect(session.isFrozen).toBe(true);
  });

  it('clears held input on pause, so a key held during a blur cannot keep steering', () => {
    session.start();
    input.intent = { ...IDLE_INTENT, moveX: 1 };

    session.pause('window-blurred');

    expect(input.clears).toBeGreaterThan(0);
    expect(input.intent).toEqual(IDLE_INTENT);
  });

  it('pauses for each automatic trigger and says which one it was', () => {
    const reasons: PauseReason[] = [
      'player',
      'tab-hidden',
      'window-blurred',
      'pointer-cancelled',
      'orientation-changed',
    ];

    for (const reason of reasons) {
      const fresh = new GameSession(new FakeInput());
      fresh.start();
      fresh.pause(reason);

      expect(fresh.status).toMatchObject({ phase: 'paused', pauseReason: reason });
    }
  });

  it('ignores a pause on the title screen and a second pause while already paused', () => {
    session.pause('player');
    expect(session.status.phase).toBe('title');

    session.start();
    session.pause('player');
    session.pause('tab-hidden');

    expect(session.status).toMatchObject({ phase: 'paused', pauseReason: 'player' });
  });

  it('runs a 3-2-1 countdown on resume, and only then starts ticking again', () => {
    session.start();
    runFrames(5);
    session.pause('player');
    session.requestResume();

    expect(session.status).toMatchObject({ phase: 'resuming', countdownSeconds: RESUME_COUNTDOWN_SECONDS });

    const ticksWhileCountingDown = runFrames(Math.ceil(RESUME_COUNTDOWN_SECONDS / ONE_FRAME_AT_60HZ) - 1);
    expect(ticksWhileCountingDown).toBe(0);
    expect(session.isFrozen).toBe(true);

    // The frame that finishes the countdown returns to running.
    runFrames(2);
    expect(session.status.phase).toBe('running');
    expect(runFrames(10)).toBe(10);
  });

  it('counts the countdown down in whole seconds', () => {
    session.start();
    session.pause('player');
    session.requestResume();

    const seen = new Set<number>([session.status.countdownSeconds]);
    for (let i = 0; i < Math.ceil(RESUME_COUNTDOWN_SECONDS / ONE_FRAME_AT_60HZ) + 2; i++) {
      session.advance(ONE_FRAME_AT_60HZ);
      seen.add(session.status.countdownSeconds);
    }

    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('does not hand the domain a backlog of ticks after a long pause', () => {
    session.start();
    session.pause('tab-hidden');
    // Minutes go by with the tab in the background.
    runFrames(200, MAX_FRAME_SECONDS);

    session.requestResume();
    runFrames(Math.ceil(RESUME_COUNTDOWN_SECONDS / ONE_FRAME_AT_60HZ) + 2);
    const ticksBefore = session.view.tickCount;
    const ticksInFirstFrame = session.advance(ONE_FRAME_AT_60HZ).ticksAdvanced;

    expect(ticksInFirstFrame).toBe(1);
    expect(session.view.tickCount).toBe(ticksBefore + 1);
  });

  it('can be paused again mid-countdown', () => {
    session.start();
    session.pause('player');
    session.requestResume();
    session.advance(ONE_FRAME_AT_60HZ);

    session.pause('tab-hidden');

    expect(session.status).toMatchObject({ phase: 'paused', pauseReason: 'tab-hidden', countdownSeconds: 0 });
    expect(runFrames(600)).toBe(0);
  });

  it('ignores a resume request that nobody paused', () => {
    session.start();

    session.requestResume();

    expect(session.status.phase).toBe('running');
  });

  it('tells subscribers about phase changes, including the current phase on subscribe', () => {
    const phases: string[] = [];
    session.subscribe((status) => phases.push(status.phase));

    session.start();
    session.pause('player');
    session.requestResume();

    expect(phases).toEqual(['title', 'running', 'paused', 'resuming']);
  });
});
