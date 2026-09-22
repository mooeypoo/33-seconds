import { describe, expect, it } from 'vitest';
import { Banter, commsDurationSeconds } from '../src/application/banter/Banter';
import { BANTER_LINES, parseBanterLine } from '../src/application/banter/lines';
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

function banter(): Banter {
  return new Banter(stream(0), BANTER_LINES);
}

const missile: DomainEvent = { type: 'MissileFired', id: 1, x: 0, y: 0 };
const spool: DomainEvent = { type: 'CyclePhaseChanged', phase: 'spooling', cycleIndex: 1 };
const arrived: DomainEvent = { type: 'CyclePhaseChanged', phase: 'arriving', cycleIndex: 1 };
const speech: DomainEvent = { type: 'SpeechStarted' };

describe('parseBanterLine', () => {
  it('drops markup, unknown speakers, and lines that do not fit the bubble', () => {
    expect(parseBanterLine({ ...BANTER_LINES[0], text: '<b>no</b>' })).toBeNull();
    expect(parseBanterLine({ ...BANTER_LINES[0], speaker: 'cylon' })).toBeNull();
    expect(parseBanterLine({ ...BANTER_LINES[0], text: 'x'.repeat(73) })).toBeNull();
  });

  it('ships a line for the opening of a cycle', () => {
    expect(BANTER_LINES.some((line) => line.id === 'adama-cycle-started-01')).toBe(true);
  });
});

describe('Banter', () => {
  it('shows one line, and a later equal-priority line does not replace it', () => {
    const comms = banter();
    comms.observe([arrived], quiet);
    expect(comms.line).toEqual({
      speakerName: 'Adama',
      text: 'PLACEHOLDER: Another 33. Hold the line.',
    });

    comms.observe([speech], quiet);
    expect(comms.line?.speakerName).toBe('Adama');
  });

  it('drops flavor while the hull is at one, and still shows a critical line', () => {
    const comms = banter();
    comms.observe([missile], { secondsRemaining: 30, hull: 1 });
    expect(comms.line).toBeNull();

    comms.observe([missile, spool], { secondsRemaining: 8, hull: 1 });
    expect(comms.line?.speakerName).toBe('Gaeta');
    expect(comms.line?.text).toContain('8');
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
    const comms = banter();
    comms.observe([missile], quiet);
    const text = comms.line?.text ?? '';
    expect(commsDurationSeconds(text)).toBeGreaterThanOrEqual(4);

    comms.advance(3);
    expect(comms.line?.text).toBe(text);
    comms.advance(2);
    expect(comms.line).toBeNull();

    comms.observe([missile], quiet);
    expect(comms.line).toBeNull();

    comms.advance(8);
    comms.observe([missile], quiet);
    expect(comms.line?.speakerName).toBe('Starbuck');
  });
});
