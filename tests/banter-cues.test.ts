import { describe, expect, it } from 'vitest';
import { GameSession, IDLE_INPUT } from '../src/application/GameSession';
import { BANTER_LINES } from '../src/application/banter/lines';
import {
  BanterCues,
  grazedTheViper,
  type CueSnapshot,
} from '../src/application/banter/cues';
import type { DomainEvent } from '../src/domain/shared/events';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

const killed: DomainEvent = { type: 'RaiderDestroyed', id: 1, x: 0, y: 0, heavy: false };

function view(patch: Partial<CueSnapshot> = {}): CueSnapshot {
  return {
    phase: 'building',
    secondsRemaining: 20,
    hull: 5,
    viperX: 100,
    viperY: 100,
    shots: [],
    shipHp: null,
    shipHpMax: null,
    ...patch,
  };
}

describe('a round that misses closely', () => {
  it('counts a pass through the ring, and not a pass through the hull or a wide miss', () => {
    const close = { id: 1, x: 100, y: 110, previousX: 100, previousY: 120, owner: 'cylon' as const };
    const wide = { id: 2, x: 100, y: 190, previousX: 100, previousY: 200, owner: 'cylon' as const };
    const through = { id: 3, x: 100, y: 102, previousX: 100, previousY: 108, owner: 'cylon' as const };
    expect(grazedTheViper(close, 100, 100)).toBe(true);
    expect(grazedTheViper(wide, 100, 100)).toBe(false);
    expect(grazedTheViper(through, 100, 100)).toBe(false);
  });
});

describe('derived lines', () => {
  it('notices three kills close together, then waits for a new cluster', () => {
    const cues = new BanterCues();
    cues.note([killed], view(), 0.4);
    cues.note([killed], view(), 0.4);
    const third = cues.note([killed], view(), 0.4);
    const multi = third.find((cue) => cue.trigger === 'MultiKill');
    expect(multi).toBeDefined();
    if (!multi) return;
    cues.accept(multi);
    expect(cues.note([], view(), 0.1).some((cue) => cue.trigger === 'MultiKill')).toBe(false);
  });

  it('grumbles after twelve quiet seconds, and not while the fleet is recovering', () => {
    const cues = new BanterCues();
    expect(cues.note([], view(), 11).some((cue) => cue.trigger === 'KillDrought')).toBe(false);
    expect(cues.note([], view(), 1).some((cue) => cue.trigger === 'KillDrought')).toBe(true);

    const resting = new BanterCues();
    expect(resting.note([], view({ phase: 'recovering' }), 20).some((cue) => cue.trigger === 'KillDrought')).toBe(
      false,
    );
  });

  it('warns once while the hull stays thin', () => {
    const cues = new BanterCues();
    const first = cues.note([], view({ hull: 2 }), 0.1).find((cue) => cue.trigger === 'HullLow');
    expect(first).toBeDefined();
    if (!first) return;
    cues.accept(first);
    expect(cues.note([], view({ hull: 1 }), 0.1).some((cue) => cue.trigger === 'HullLow')).toBe(false);
    expect(cues.note([], view({ hull: 5 }), 0.1).some((cue) => cue.trigger === 'HullLow')).toBe(false);
    expect(cues.note([], view({ hull: 2 }), 0.1).some((cue) => cue.trigger === 'HullLow')).toBe(true);
  });

  it('calls the factory at 75, 50, and 25, using the hull that is left', () => {
    const cues = new BanterCues();
    expect(cues.note([], view({ shipHp: 60, shipHpMax: 60 }), 0).some((cue) => cue.shipPercent !== undefined)).toBe(
      false,
    );
    const at75 = cues.note([], view({ shipHp: 45, shipHpMax: 60 }), 0).find((cue) => cue.trigger === 'ResurrectionShipMilestone');
    expect(at75?.shipPercent).toBe(75);
    if (!at75) return;
    cues.accept(at75);
    expect(cues.note([], view({ shipHp: 45, shipHpMax: 60 }), 0).some((cue) => cue.trigger === 'ResurrectionShipMilestone')).toBe(
      false,
    );
    const at50 = cues.note([], view({ shipHp: 30, shipHpMax: 60 }), 0).find((cue) => cue.trigger === 'ResurrectionShipMilestone');
    expect(at50?.shipPercent).toBe(50);
  });

  it('adds a spool call at five seconds and at two', () => {
    const cues = new BanterCues();
    const five = cues.note([], view({ phase: 'spooling', secondsRemaining: 5 }), 0).find((cue) => cue.token === 'spool:5');
    expect(five?.trigger).toBe('FtlSpoolProgress');
    if (!five) return;
    cues.accept(five);
    expect(cues.note([], view({ phase: 'spooling', secondsRemaining: 5 }), 0).some((cue) => cue.token === 'spool:5')).toBe(
      false,
    );
    expect(cues.note([], view({ phase: 'spooling', secondsRemaining: 2 }), 0).some((cue) => cue.token === 'spool:2')).toBe(
      true,
    );
  });

  it('asks about a graze once per round', () => {
    const shot = { id: 7, x: 100, y: 110, previousX: 100, previousY: 120, owner: 'cylon' as const };
    const cues = new BanterCues();
    const first = cues.note([], view({ shots: [shot] }), 0.1).find((cue) => cue.trigger === 'CloseCall');
    expect(first).toBeDefined();
    if (!first) return;
    cues.accept(first);
    expect(cues.note([], view({ shots: [shot] }), 0.1).some((cue) => cue.trigger === 'CloseCall')).toBe(false);
  });
});

describe('the session says the quiet part', () => {
  it('grumbles when a fight goes twelve seconds without a kill', () => {
    const session = new GameSession(IDLE_INPUT, { raidersFire: false });
    session.start();
    const drought = BANTER_LINES.filter((line) => line.trigger === 'KillDrought').map((line) => line.text);
    let heard = false;
    for (let frame = 0; frame < TICKS_PER_SECOND * 16 && !heard; frame++) {
      session.advance(TICK_SECONDS);
      heard = drought.includes(session.status.comms?.text ?? '');
    }
    expect(heard).toBe(true);
  });
});
