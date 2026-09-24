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
import { RECOVERING_SCENES } from '../src/application/banter/recoveringScene';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

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

  it('discards a paused run, and the next Launch does not inherit it', () => {
    session.start();
    runFrames(30);
    expect(session.view.tickCount).toBe(30);

    session.abandonRun();
    expect(session.status.phase).toBe('running');

    session.pause('player');
    input.intent = { moveX: 1, moveY: 0, missile: true, special: false };
    session.abandonRun();

    expect(session.status).toMatchObject({ phase: 'title', pauseReason: null, countdownSeconds: 0 });
    expect(input.intent).toEqual(IDLE_INTENT);
    expect(runFrames(10)).toBe(0);

    session.start();
    expect(session.view.tickCount).toBe(0);
    expect(session.status.phase).toBe('running');
  });

  it('does not abandon during the resume countdown', () => {
    session.start();
    runFrames(5);
    session.pause('player');
    session.requestResume();

    session.abandonRun();

    expect(session.status.phase).toBe('resuming');
    expect(session.view.tickCount).toBe(5);
  });

  it('keeps the comms line up while paused', () => {
    session.start();
    runFrames(1);
    const line = session.status.comms;
    expect(line?.speakerName === 'Adama' || line?.speakerName === 'Starbuck').toBe(true);

    session.pause('player');
    runFrames(TICKS_PER_SECOND * 10);

    expect(session.status.comms).toEqual(line);
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

  it('freezes the jump clock while paused, including mid-spool', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 26);

    expect(session.view.cycle.phase).toBe('spooling');
    const remaining = session.view.cycle.secondsRemaining;

    session.pause('player');
    runFrames(TICKS_PER_SECOND * 2);

    expect(session.view.cycle.phase).toBe('spooling');
    expect(session.view.cycle.secondsRemaining).toBe(remaining);
  });

  it('does not let Continue skip Recovering while the Apply countdown is paused', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 35);
    expect(session.view.cycle.phase).toBe('recovering');

    const cardId = session.view.upgradeOffer?.cardIds[0] ?? '';
    session.pickUpgrade(cardId);
    session.pause('player');
    expect(session.status.phase).toBe('paused');

    session.continueFromJump();
    session.advance(ONE_FRAME_AT_60HZ);

    expect(session.view.cycle.phase).toBe('recovering');
    expect(session.view.loadout.some((card) => card.id === cardId)).toBe(false);
  });

  it('counts 3-2-1 after Apply, and only then starts the next cycle', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 35);
    expect(session.view.cycle.phase).toBe('recovering');
    expect(session.status.choosingUpgrade).toBe(true);

    const beats = RECOVERING_SCENES.flatMap((scene) => scene.beats.map((beat) => beat.text));
    expect(beats).toContain(session.status.comms?.text);

    session.pickUpgrade('not-a-card');
    session.advance(ONE_FRAME_AT_60HZ);
    expect(session.view.cycle.phase).toBe('recovering');
    expect(session.status.phase).toBe('running');

    const cardId = session.view.upgradeOffer?.cardIds[0] ?? '';
    expect(cardId).not.toBe('');
    session.pickUpgrade(cardId);
    expect(session.status).toMatchObject({ phase: 'resuming', countdownSeconds: RESUME_COUNTDOWN_SECONDS });
    expect(session.view.cycle.phase).toBe('recovering');
    expect(session.status.choosingUpgrade).toBe(false);

    const ticksWhileCounting = runFrames(Math.ceil(RESUME_COUNTDOWN_SECONDS / ONE_FRAME_AT_60HZ) - 1);
    expect(ticksWhileCounting).toBe(0);
    expect(session.view.cycle.phase).toBe('recovering');

    runFrames(2);
    expect(session.status.phase).toBe('running');
    expect(session.view.cycle.phase).toBe('arriving');
    expect(session.view.loadout.some((card) => card.id === cardId)).toBe(true);
  });

  it('does not cover the Recovering sheet when focus leaves or the player asks to pause', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 35);
    expect(session.status.choosingUpgrade).toBe(true);

    session.pause('window-blurred');
    session.pause('tab-hidden');
    session.pause('orientation-changed');
    session.pause('pointer-cancelled');
    session.pause('player');
    expect(session.status.phase).toBe('running');
    expect(session.view.cycle.phase).toBe('recovering');
  });

  it('keeps an applied card if focus leaves during the countdown', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 35);
    const cardId = session.view.upgradeOffer?.cardIds[0] ?? '';
    session.pickUpgrade(cardId);
    expect(session.status.phase).toBe('resuming');

    session.pause('window-blurred');
    expect(session.status.phase).toBe('paused');

    session.requestResume();
    runFrames(Math.ceil(RESUME_COUNTDOWN_SECONDS / ONE_FRAME_AT_60HZ) + 2);
    expect(session.view.cycle.phase).toBe('arriving');
    expect(session.view.loadout.some((card) => card.id === cardId)).toBe(true);
  });

  it('stays in Recovering after the scene ends until a card is applied', () => {
    session.start();
    runFrames(TICKS_PER_SECOND * 35);
    expect(session.view.cycle.phase).toBe('recovering');

    runFrames(TICKS_PER_SECOND * 13);
    expect(session.view.cycle.phase).toBe('recovering');
    expect(session.view.upgradeOffer).not.toBeNull();
  });
});

describe('winning', () => {
  function steerToward(x: number): void {
    const delta = x - session.view.viper.x;
    const scaled = delta / 20;
    const moveX = scaled > 1 ? 1 : scaled < -1 ? -1 : scaled;
    input.intent = { ...IDLE_INTENT, moveX, moveY: 0 };
  }

  function playUntilWon(): boolean {
    for (let i = 0; i < TICKS_PER_SECOND * 30; i++) {
      const ship = session.view.resurrectionShip;
      if (ship && !ship.destroyed) steerToward(ship.x);
      else {
        const raider = session.view.raiders.find((body) => !body.protected) ?? session.view.raiders[0];
        if (raider) steerToward(raider.x);
        else input.intent = IDLE_INTENT;
      }
      session.advance(ONE_FRAME_AT_60HZ);
      if (session.status.phase === 'won') return true;
    }
    return false;
  }

  beforeEach(() => {
    input = new FakeInput();
    session = new GameSession(input, {
      seed: 1,
      raidersFire: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
      resurrectionShipHitPoints: 1,
    });
  });

  it('freezes on the win, ignores pause, and Launch starts a new run', () => {
    session.start();
    expect(playUntilWon()).toBe(true);
    expect(session.isFrozen).toBe(true);
    const ticksAtWin = session.view.tickCount;

    session.pause('player');
    expect(session.status.phase).toBe('won');
    expect(runFrames(10)).toBe(0);
    expect(session.view.tickCount).toBe(ticksAtWin);

    session.returnToTitle();
    expect(session.status.phase).toBe('title');

    session.start();
    expect(session.view.tickCount).toBe(0);
    expect(session.view.resurrectionShip).toBeNull();
    runFrames(1);
    expect(session.status.phase).toBe('running');
    expect(session.view.resurrectionShip?.destroyed).toBe(false);
    expect(session.view.resurrectionShip?.hp).toBe(1);
  });

  it('ignores Continue to title until the run is actually won', () => {
    session.start();
    session.returnToTitle();
    expect(session.status.phase).toBe('running');
  });
});

describe('losing', () => {
  beforeEach(() => {
    input = new FakeInput();
    session = new GameSession(input, {
      seed: 1,
      raidersFire: false,
      fleetStartingIntegrity: 8,
    });
  });

  it('freezes when the fleet is gone, and Retry starts a new run', () => {
    session.start();
    let lost = false;
    for (let i = 0; i < TICKS_PER_SECOND * 15; i++) {
      session.advance(ONE_FRAME_AT_60HZ);
      if (session.status.phase === 'lost') {
        lost = true;
        break;
      }
    }
    expect(lost).toBe(true);
    expect(session.isFrozen).toBe(true);
    const ticksAtLoss = session.view.tickCount;

    session.pause('player');
    expect(session.status.phase).toBe('lost');
    expect(runFrames(10)).toBe(0);
    expect(session.view.tickCount).toBe(ticksAtLoss);

    session.returnToTitle();
    expect(session.status.phase).toBe('title');
    session.start();
    expect(session.view.tickCount).toBe(0);
    expect(session.view.fleet.integrity).toBe(8);
  });
});

describe('the HUD feed', () => {
  it('follows the running game, freezes with pause, and resets for a new run', () => {
    const shown: number[] = [];
    session.subscribeHud((hud) => shown.push(hud.secondsRemaining));
    session.start();
    runFrames(TICKS_PER_SECOND * 2);
    const running = shown.at(-1) ?? 0;
    expect(running).toBeLessThan(33);

    session.pause('player');
    runFrames(TICKS_PER_SECOND * 3);
    expect(shown.at(-1)).toBe(running);

    session.abandonRun();
    session.start();
    expect(shown.at(-1)).toBe(33);
  });

  it('names the newest bonus and counts the older ones', () => {
    const withCards = new GameSession(input, { startingCards: ['spoilers', 'flak-enthusiast'] });
    let latest: string | null = null;
    let older = -1;
    withCards.subscribeHud((hud) => {
      latest = hud.latestUpgradeId;
      older = hud.olderUpgradeCount;
    });
    withCards.start();
    expect(latest).toBe('flak-enthusiast');
    expect(older).toBe(1);
  });
});
