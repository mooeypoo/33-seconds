import { beforeEach, describe, expect, it } from 'vitest';
import {
  AudioDirector,
  MAX_VOICES,
  MAX_VOICES_PER_SOUND,
  MIN_REPEAT_SECONDS,
  PITCH_JITTER,
} from '../src/application/audio/AudioDirector';
import { SOUND_IDS, type SoundId } from '../src/application/audio/soundIds';
import { GameSession, IDLE_INPUT, RESUME_COUNTDOWN_SECONDS } from '../src/application/GameSession';
import type { AudioPort } from '../src/application/ports/AudioPort';
import type { DomainEvent } from '../src/domain/shared/events';
import type { CycleView } from '../src/domain/views';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

/** Records what the application asked for. How anything sounds is not tested (AGENTS.md). */
class FakeAudio implements AudioPort {
  plays: { id: SoundId; rate: number }[] = [];
  unlocks = 0;
  suspended = false;
  gain = 1;
  /** How long every sound lasts, as the adapter would report it. */
  seconds = 0.2;

  unlock(): void {
    this.unlocks += 1;
  }

  play(id: SoundId, rate: number): number {
    this.plays.push({ id, rate });
    return this.seconds;
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
  }

  setMasterGain(gain: number): void {
    this.gain = gain;
  }

  ids(): SoundId[] {
    return this.plays.map((play) => play.id);
  }
}

const FIGHTING: Pick<CycleView, 'phase' | 'secondsRemaining'> = { phase: 'building', secondsRemaining: 20 };
const FRAME = TICK_SECONDS;

const kill = (heavy = false): DomainEvent => ({ type: 'RaiderDestroyed', id: 1, x: 0, y: 0, heavy });
const spawn = (returned: boolean): DomainEvent => ({
  type: 'RaiderSpawned',
  id: 1,
  identityId: 1,
  x: 0,
  y: 0,
  returned,
  deaths: returned ? 1 : 0,
  heavy: false,
});
const shipHit = (shielded: boolean): DomainEvent => ({ type: 'ResurrectionShipHit', x: 0, y: 0, hp: 5, shielded });
const phase = (to: 'building' | 'jumping' | 'spooling'): DomainEvent => ({
  type: 'CyclePhaseChanged',
  phase: to,
  cycleIndex: 1,
});

let audio: FakeAudio;
let director: AudioDirector;

beforeEach(() => {
  audio = new FakeAudio();
  director = new AudioDirector(audio, 7);
  director.unlock();
});

describe('which fact makes which sound', () => {
  it.each<[DomainEvent, SoundId]>([
    [kill(), 'raider_destroyed'],
    [kill(true), 'heavy_destroyed'],
    [{ type: 'ResurrectionShipDestroyed', x: 0, y: 0 }, 'ship_destroyed'],
    [{ type: 'MissileFired', id: 1, x: 0, y: 0 }, 'missile_launch'],
    [{ type: 'ViperHit', x: 0, y: 0, hp: 2 }, 'viper_hit'],
    [{ type: 'ViperEjected', x: 0, y: 0 }, 'viper_eject'],
    [{ type: 'FleetHit', damage: 1, integrity: 90, x: 0, shipId: 1, kind: 'stray' }, 'fleet_hit'],
    [spawn(true), 'raider_returned'],
    [{ type: 'ResurrectionShipArrived', x: 0, y: 0 }, 'ship_arrived'],
    [shipHit(true), 'shield_hit'],
    [phase('jumping'), 'jump'],
    [{ type: 'SpeechStarted' }, 'speech'],
    [{ type: 'RunWon' }, 'run_won'],
    [{ type: 'RunLost' }, 'run_lost'],
  ])('%o plays %s', (event, id) => {
    director.noteFrame([event], FIGHTING, FRAME);
    expect(audio.ids()).toEqual([id]);
  });

  it('keeps auto-fire, fresh spawns, non-kill hits, and a bare hull hit silent', () => {
    director.noteFrame(
      [
        { type: 'ShotFired', id: 1, x: 0, y: 0, owner: 'player' },
        { type: 'ShotFired', id: 2, x: 0, y: 0, owner: 'cylon' },
        spawn(false),
        shipHit(false),
        { type: 'RaiderHit', id: 1, x: 0, y: 0, hp: 1, heavy: false },
        phase('building'),
        phase('spooling'),
        { type: 'UpgradePicked', cardId: 'x' },
      ],
      FIGHTING,
      FRAME,
    );
    expect(audio.plays).toEqual([]);
  });

  it('gives a heavy kill and a plain kill on the same frame one sound each', () => {
    director.noteFrame([kill(true), kill(), kill(true), kill()], FIGHTING, FRAME);
    expect(audio.ids().sort()).toEqual(['heavy_destroyed', 'raider_destroyed']);
  });

  it('has a sound for every id the table or the overlay can ask for', () => {
    // Ids with no trigger would be dead content in sounds.json. Short sounds, so no cap is in the way.
    audio.seconds = 0;
    const heard = new Set<SoundId>();
    const events: DomainEvent[] = [
      kill(),
      kill(true),
      { type: 'ResurrectionShipDestroyed', x: 0, y: 0 },
      { type: 'MissileFired', id: 1, x: 0, y: 0 },
      { type: 'ViperHit', x: 0, y: 0, hp: 2 },
      { type: 'ViperEjected', x: 0, y: 0 },
      { type: 'FleetHit', damage: 1, integrity: 90, x: 0, shipId: 1, kind: 'strafe' },
      spawn(true),
      { type: 'ResurrectionShipArrived', x: 0, y: 0 },
      shipHit(true),
      phase('jumping'),
      { type: 'SpeechStarted' },
      { type: 'RunWon' },
      { type: 'RunLost' },
    ];
    director.noteFrame(events, FIGHTING, FRAME);
    director.noteFrame([], { phase: 'spooling', secondsRemaining: 5 }, 1);
    director.noteFrame([], { phase: 'spooling', secondsRemaining: 2 }, 1);
    director.cue('card_select');
    director.cue('card_apply');
    for (const id of audio.ids()) heard.add(id);
    expect([...heard].sort()).toEqual([...SOUND_IDS].sort());
  });
});

describe('before the first gesture', () => {
  it('asks the port for nothing, however loud the fight, until unlocked', () => {
    const quiet = new FakeAudio();
    const locked = new AudioDirector(quiet, 7);
    locked.setHeld(true);
    locked.setHeld(false);
    locked.noteFrame([kill(), { type: 'RunWon' }], FIGHTING, 1);
    locked.cue('card_apply');
    expect(quiet.plays).toEqual([]);
    expect(quiet.unlocks).toBe(0);

    locked.unlock();
    locked.noteFrame([kill()], FIGHTING, 1);
    expect(quiet.ids()).toEqual(['raider_destroyed']);
  });
});

describe('the FTL spool calls', () => {
  it('sounds at 5 and at 2 once each, however many frames sit on that second', () => {
    for (const seconds of [7, 6, 5, 5, 5, 4, 3, 2, 2, 1]) {
      director.noteFrame([], { phase: 'spooling', secondsRemaining: seconds }, 0.5);
    }
    expect(audio.ids()).toEqual(['spool_5s', 'spool_2s']);
  });

  it('calls again on the next cycle, and not outside the spool', () => {
    director.noteFrame([], { phase: 'building', secondsRemaining: 5 }, 1);
    director.noteFrame([], { phase: 'spooling', secondsRemaining: 5 }, 1);
    director.noteFrame([], { phase: 'jumping', secondsRemaining: 0 }, 1);
    director.noteFrame([], { phase: 'spooling', secondsRemaining: 5 }, 1);
    expect(audio.ids()).toEqual(['spool_5s', 'spool_5s']);
  });
});

describe('the repeat limit', () => {
  it('never plays one sound twice inside the minimum gap, even in a long kill chain', () => {
    audio.seconds = 0;
    const playedAt: number[] = [];
    let clock = 0;
    for (let frame = 0; frame < 120; frame++) {
      clock += FRAME;
      const before = audio.plays.length;
      director.noteFrame([kill(), kill()], FIGHTING, FRAME);
      if (audio.plays.length > before) playedAt.push(clock);
    }
    expect(audio.plays.length).toBe(playedAt.length);
    for (let i = 1; i < playedAt.length; i++) {
      expect(playedAt[i]! - playedAt[i - 1]!).toBeGreaterThanOrEqual(MIN_REPEAT_SECONDS - 1e-9);
    }
    // Two seconds of kills every frame still sounds like a chain, not one bang.
    expect(playedAt.length).toBeGreaterThan(20);
  });

  it('does not let one sound block a different one', () => {
    director.noteFrame([kill(), { type: 'MissileFired', id: 1, x: 0, y: 0 }, kill(true)], FIGHTING, FRAME);
    expect(audio.ids()).toEqual(['raider_destroyed', 'missile_launch', 'heavy_destroyed']);
  });

  it('holds one sound to a few voices while they ring, and frees them when they end', () => {
    audio.seconds = 1;
    // A kill every 100 ms for three seconds: each sound rings a full second.
    const startedAt: number[] = [];
    let clock = 0;
    for (let frame = 0; frame < 30; frame++) {
      clock += 0.1;
      const before = audio.plays.length;
      director.noteFrame([kill()], FIGHTING, 0.1);
      if (audio.plays.length > before) startedAt.push(clock);
    }
    for (const at of startedAt) {
      const ringing = startedAt.filter((other) => other <= at + 1e-9 && other > at - 1 + 1e-9);
      expect(ringing.length).toBeLessThanOrEqual(MAX_VOICES_PER_SOUND);
    }
    // Voices free up as they end, so the chain keeps sounding after the first second.
    expect(startedAt.some((at) => at > 1.5)).toBe(true);
  });

  it('caps everything sounding at once', () => {
    audio.seconds = 10;
    const everything = SOUND_IDS.filter((id) => id !== 'spool_5s' && id !== 'spool_2s');
    for (const id of everything) director.cue(id);
    expect(everything.length).toBeGreaterThan(MAX_VOICES);
    expect(audio.plays.length).toBe(MAX_VOICES);
  });

  it('varies the pitch of a repeated sound a little, repeatably, and leaves one-offs as written', () => {
    audio.seconds = 0;
    for (let frame = 0; frame < 40; frame++) director.noteFrame([kill()], FIGHTING, 0.1);
    const rates = audio.plays.map((play) => play.rate);
    expect(new Set(rates).size).toBeGreaterThan(5);
    for (const rate of rates) {
      expect(rate).toBeGreaterThanOrEqual(1 - PITCH_JITTER);
      expect(rate).toBeLessThanOrEqual(1 + PITCH_JITTER);
    }

    const again = new FakeAudio();
    again.seconds = 0;
    const twin = new AudioDirector(again, 7);
    twin.unlock();
    for (let frame = 0; frame < 40; frame++) twin.noteFrame([kill()], FIGHTING, 0.1);
    expect(again.plays.map((play) => play.rate)).toEqual(rates);

    director.noteFrame([{ type: 'RunWon' }], FIGHTING, FRAME);
    expect(audio.plays.at(-1)).toEqual({ id: 'run_won', rate: 1 });
  });
});

describe('mute and volume', () => {
  it('is instant and total, and unmuting does not dump what was missed', () => {
    director.setLevel(false, 0.5);
    expect(audio.gain).toBe(0.5);

    director.setLevel(true, 0.5);
    expect(audio.gain).toBe(0);
    for (let frame = 0; frame < 30; frame++) director.noteFrame([kill(), { type: 'RunWon' }], FIGHTING, 0.1);
    expect(audio.plays).toEqual([]);

    director.setLevel(false, 0.5);
    expect(audio.gain).toBe(0.5);
    expect(audio.plays).toEqual([]);
    director.noteFrame([kill()], FIGHTING, FRAME);
    expect(audio.ids()).toEqual(['raider_destroyed']);
  });

  it('keeps a hostile volume inside 0..1', () => {
    director.setLevel(false, 7);
    expect(audio.gain).toBe(1);
    director.setLevel(false, -3);
    expect(audio.gain).toBe(0);
  });
});

describe('sound in the session', () => {
  let session: GameSession;

  beforeEach(() => {
    audio = new FakeAudio();
    session = new GameSession(IDLE_INPUT, { seed: 3, audio });
  });

  function runSeconds(seconds: number): void {
    for (let i = 0; i < Math.round(seconds * TICKS_PER_SECOND); i++) session.advance(FRAME);
  }

  it('asks for no audio at all before Launch, and unlocks on Launch', () => {
    runSeconds(2);
    session.cardHighlighted();
    expect(audio.unlocks).toBe(0);
    expect(audio.plays).toEqual([]);

    session.start();
    expect(audio.unlocks).toBe(1);
  });

  it('plays the fight: a seeded run makes kill sounds, and nothing while paused', () => {
    session.start();
    runSeconds(20);
    expect(audio.ids()).toContain('raider_destroyed');

    session.pause('player');
    expect(audio.suspended).toBe(true);
    const beforePause = audio.plays.length;
    runSeconds(5);
    session.cardHighlighted();
    expect(audio.plays.length).toBe(beforePause);
  });

  it('stays suspended through the resume countdown, and thaws when the fight does', () => {
    session.start();
    runSeconds(1);
    session.pause('window-blurred');
    session.requestResume();
    runSeconds(RESUME_COUNTDOWN_SECONDS - 0.5);
    expect(session.status.phase).toBe('resuming');
    expect(audio.suspended).toBe(true);

    runSeconds(1);
    expect(session.status.phase).toBe('running');
    expect(audio.suspended).toBe(false);
  });

  it('goes quiet on a hidden tab even on the Recovering sheet, which does not pause', () => {
    session.start();
    runSeconds(35);
    expect(session.status.choosingUpgrade).toBe(true);

    session.setPageHidden(true);
    session.pause('tab-hidden');
    expect(session.status.phase).toBe('running');
    expect(audio.suspended).toBe(true);
    const before = audio.plays.length;
    session.cardHighlighted();
    expect(audio.plays.length).toBe(before);

    session.setPageHidden(false);
    expect(audio.suspended).toBe(false);
    session.cardHighlighted();
    expect(audio.ids().at(-1)).toBe('card_select');
  });

  it('keeps a hidden tab quiet after the pause it caused is resumed', () => {
    session.start();
    runSeconds(1);
    session.setPageHidden(true);
    session.pause('tab-hidden');
    session.requestResume();
    runSeconds(RESUME_COUNTDOWN_SECONDS + 1);
    expect(session.status.phase).toBe('running');
    expect(audio.suspended).toBe(true);
  });

  it('plays Apply at once and lets it ring through the 3-2-1, which is not a pause', () => {
    session.start();
    runSeconds(35);
    const cardId = session.view.upgradeOffer?.cardIds[0] ?? '';
    session.pickUpgrade(cardId);
    expect(audio.ids().at(-1)).toBe('card_apply');
    expect(session.status.phase).toBe('resuming');
    expect(audio.suspended).toBe(false);
  });

  it('only sounds a card highlight while the sheet is up', () => {
    session.start();
    runSeconds(1);
    session.cardHighlighted();
    expect(audio.ids()).not.toContain('card_select');
  });
});
