import { describe, expect, it } from 'vitest';
import { Banter, commsDurationSeconds } from '../src/application/banter/Banter';
import { BANTER_LINES, parseBanterLine, parseBanterSource, type BanterLine } from '../src/application/banter/lines';
import type { DomainEvent } from '../src/domain/shared/events';
import type { RandomStream } from '../src/domain/shared/random';

const quiet = { secondsRemaining: 30, hull: 5 };

function stream(value: number): RandomStream {
  return {
    next: () => value,
    between: () => value,
    index: () => 0,
  };
}

function sequence(values: readonly number[]): RandomStream {
  let index = 0;
  return {
    next: () => values[Math.min(index++, values.length - 1)] ?? 0,
    between: () => 0,
    index: () => 0,
  };
}

function banter(): Banter {
  return new Banter(stream(0), BANTER_LINES);
}

const missile: DomainEvent = { type: 'MissileFired', id: 1, x: 0, y: 0 };
const spool: DomainEvent = { type: 'CyclePhaseChanged', phase: 'spooling', cycleIndex: 1 };
const arrived: DomainEvent = { type: 'CyclePhaseChanged', phase: 'arriving', cycleIndex: 1 };
const speech: DomainEvent = { type: 'SpeechStarted' };
const recovering: DomainEvent = { type: 'CyclePhaseChanged', phase: 'recovering', cycleIndex: 1 };
const rerolled: DomainEvent = { type: 'UpgradeRerolled' };

describe('parseBanterLine', () => {
  it('drops markup, unknown speakers, and lines that do not fit the bubble', () => {
    expect(parseBanterLine({ ...BANTER_LINES[0], text: '<b>no</b>' })).toBeNull();
    expect(parseBanterLine({ ...BANTER_LINES[0], speaker: 'cylon' })).toBeNull();
    expect(parseBanterLine({ ...BANTER_LINES[0], text: 'x'.repeat(73) })).toBeNull();
  });

  it('ships a line for the opening of a cycle', () => {
    expect(BANTER_LINES.some((line) => line.id === 'adama-cycle-started-01')).toBe(true);
  });

  it('expands a pool and drops a line that does not fit', () => {
    const lines = parseBanterSource({
      speaker: 'adama',
      pools: [
        {
          trigger: 'CycleStarted',
          priority: 'normal',
          cooldownSeconds: 20,
          chance: 0.25,
          lines: [
            { id: 'adama-cycle-started-09', text: 'Hold.' },
            { id: 'adama-cycle-started-10', text: 'x'.repeat(73) },
          ],
        },
      ],
    });
    expect(lines).toEqual([
      {
        id: 'adama-cycle-started-09',
        speaker: 'adama',
        trigger: 'CycleStarted',
        text: 'Hold.',
        weight: 1,
        cooldownSeconds: 20,
        priority: 'normal',
        chance: 0.25,
        poolId: 'adama:CycleStarted:0',
      },
    ]);
  });
});

describe('Banter', () => {
  it('shows one line, and a later equal-priority line does not replace it', () => {
    const comms = banter();
    comms.observe([arrived], quiet);
    expect(comms.line).toEqual({
      speakerName: 'Adama',
      text: 'Thirty-three seconds. Hold the line.',
    });

    comms.observe([speech], quiet);
    expect(comms.line?.speakerName).toBe('Adama');
  });

  it('drops flavor while the hull is at one, and still shows a critical line', () => {
    const comms = banter();
    comms.observe([missile], { secondsRemaining: 30, hull: 1 });
    expect(comms.line).toBeNull();

    comms.observe([missile, spool], { secondsRemaining: 8, hull: 1, spoolPercent: 40 });
    expect(comms.line?.speakerName).toBe('Gaeta');
    expect(comms.line?.text).toContain('40');
  });

  it('keeps a rare pool quiet when the roll misses, and fills the jump clock', () => {
    const lines: BanterLine[] = [
      {
        id: 'adama-cycle-started-01',
        speaker: 'adama',
        trigger: 'CycleStarted',
        text: 'Jump in {seconds}.',
        weight: 1,
        cooldownSeconds: 30,
        priority: 'normal',
        chance: 1,
        poolId: 'adama',
      },
      {
        id: 'starbuck-cycle-started-01',
        speaker: 'starbuck',
        trigger: 'CycleStarted',
        text: 'Dibs.',
        weight: 1,
        cooldownSeconds: 30,
        priority: 'normal',
        chance: 0.25,
        poolId: 'starbuck',
      },
    ];
    const missed = new Banter(stream(0.9), lines);
    missed.observe([arrived], quiet);
    expect(missed.line).toEqual({ speakerName: 'Adama', text: 'Jump in 30.' });

    // Chance opens the pool, then the weighted roll lands on Starbuck.
    const hit = new Banter(sequence([0, 0.99]), lines);
    hit.observe([arrived], quiet);
    expect(hit.line?.speakerName).toBe('Starbuck');
  });

  it('lets a critical line replace flavor, and a low roll picks the other spool report', () => {
    const comms = banter();
    comms.observe([missile], quiet);
    expect(comms.line?.speakerName).toBe('Starbuck');

    comms.observe([spool], { secondsRemaining: 8, hull: 5 });
    expect(comms.line?.speakerName).toBe('Gaeta');

    const other = new Banter(stream(0.999), BANTER_LINES);
    other.observe([spool], { secondsRemaining: 8, hull: 5 });
    expect(other.line?.speakerName).toBe('Dualla');
  });

  it('holds a line for its reading time, then respects that line’s cooldown', () => {
    const only: BanterLine = {
      id: 'starbuck-missile-launched-01',
      speaker: 'starbuck',
      trigger: 'MissileLaunched',
      text: 'Catch.',
      weight: 1,
      cooldownSeconds: 15,
      priority: 'flavor',
      chance: 1,
      poolId: 'missile',
    };
    const comms = new Banter(stream(0), [only]);
    comms.observe([missile], quiet);
    expect(comms.line?.text).toBe('Catch.');
    expect(commsDurationSeconds('Catch.')).toBeGreaterThanOrEqual(4);

    comms.advance(3);
    expect(comms.line?.text).toBe('Catch.');
    comms.advance(2);
    expect(comms.line).toBeNull();

    comms.observe([missile], quiet);
    expect(comms.line).toBeNull();

    comms.advance(20);
    comms.observe([missile], quiet);
    expect(comms.line?.text).toBe('Catch.');
  });

  it('talks about a card on the table, and a new hand replaces that line', () => {
    const lines: BanterLine[] = [
      {
        id: 'baltar-upgrade-offered-01',
        speaker: 'baltar',
        trigger: 'UpgradeOffered',
        text: 'Wide.',
        weight: 1,
        cooldownSeconds: 20,
        priority: 'normal',
        chance: 1,
        poolId: 'wide',
        upgradeId: 'accidentally-wide',
      },
      {
        id: 'roslin-upgrade-offered-11',
        speaker: 'roslin',
        trigger: 'UpgradeOffered',
        text: 'Hold.',
        weight: 1,
        cooldownSeconds: 20,
        priority: 'normal',
        chance: 1,
        poolId: 'hold',
        upgradeId: 'your-call-is-important-to-us',
      },
      {
        id: 'tyrol-cycle-recovering-01',
        speaker: 'tyrol',
        trigger: 'CycleRecovering',
        text: 'Patch.',
        weight: 1,
        cooldownSeconds: 20,
        priority: 'flavor',
        chance: 1,
        poolId: 'tyrol',
      },
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([recovering], { ...quiet, offeredCardIds: ['accidentally-wide'] });
    expect(comms.line).toEqual({ speakerName: 'Baltar', text: 'Wide.' });

    comms.observe([rerolled], { ...quiet, offeredCardIds: ['your-call-is-important-to-us'] });
    expect(comms.line).toEqual({ speakerName: 'Roslin', text: 'Hold.' });
  });
});
