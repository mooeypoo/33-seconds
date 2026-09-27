import { describe, expect, it } from 'vitest';
import {
  Banter,
  COMMS_GAP_SECONDS,
  COMMS_MIN_SHOWN_SECONDS,
  commsDurationSeconds,
  FLAVOR_LINES_PER_CYCLE,
} from '../src/application/banter/Banter';
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
    expect(comms.line).toMatchObject({
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
    expect(missed.line).toMatchObject({ speakerName: 'Adama', text: 'Jump in 30.' });

    // Chance opens the pool, then the weighted roll lands on Starbuck.
    const hit = new Banter(sequence([0, 0.99]), lines);
    hit.observe([arrived], quiet);
    expect(hit.line?.speakerName).toBe('Starbuck');
  });

  it('lets a critical line replace flavor, and a low roll picks the other spool report', () => {
    const comms = banter();
    comms.observe([missile], quiet);
    expect(comms.line).toMatchObject({ speaker: 'starbuck', speakerName: 'Starbuck', critical: false });

    // Critical, so it carries no voice over the spool sounds (PRD 14.3).
    comms.observe([spool], { secondsRemaining: 8, hull: 5 });
    expect(comms.line).toMatchObject({ speaker: 'gaeta', speakerName: 'Gaeta', critical: true });

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
    expect(comms.line).toMatchObject({ speakerName: 'Baltar', text: 'Wide.' });

    comms.observe([rerolled], { ...quiet, offeredCardIds: ['your-call-is-important-to-us'] });
    expect(comms.line).toMatchObject({ speakerName: 'Roslin', text: 'Hold.' });
  });

  it('asks who you are talking to only when the strip is empty, and not at one hull', () => {
    const lines: BanterLine[] = [
      {
        id: 'starbuck-missile-01',
        speaker: 'starbuck',
        trigger: 'MissileLaunched',
        text: 'Catch.',
        weight: 1,
        cooldownSeconds: 15,
        priority: 'flavor',
        chance: 1,
        poolId: 'missile',
      },
      {
        id: 'tigh-imaginary-six-active-01',
        speaker: 'tigh',
        trigger: 'ImaginarySixActive',
        text: 'Who?',
        weight: 1,
        cooldownSeconds: 25,
        priority: 'flavor',
        chance: 1,
        poolId: 'six',
      },
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([missile], quiet);
    expect(comms.line?.text).toBe('Catch.');
    expect(comms.mention('ImaginarySixActive', quiet)).toBe(false);

    comms.advance(20);
    expect(comms.mention('ImaginarySixActive', { ...quiet, hull: 1 })).toBe(false);
    expect(comms.line).toBeNull();

    expect(comms.mention('ImaginarySixActive', quiet)).toBe(true);
    expect(comms.line).toMatchObject({ speakerName: 'Tigh', text: 'Who?' });
  });

  it('reports a fleet hit, a return, and the factory going down', () => {
    const lines: BanterLine[] = [
      {
        id: 'gaeta-fleet-hit-01',
        speaker: 'gaeta',
        trigger: 'FleetHit',
        text: 'Logged.',
        weight: 1,
        cooldownSeconds: 20,
        priority: 'normal',
        chance: 1,
        poolId: 'hit',
      },
      {
        id: 'starbuck-raider-resurrected-01',
        speaker: 'starbuck',
        trigger: 'RaiderResurrected',
        text: 'Back.',
        weight: 1,
        cooldownSeconds: 15,
        priority: 'flavor',
        chance: 1,
        poolId: 'back',
      },
      {
        id: 'adama-big-raider-entered-01',
        speaker: 'adama',
        trigger: 'BigRaiderEntered',
        text: 'Heavy.',
        weight: 1,
        cooldownSeconds: 30,
        priority: 'normal',
        chance: 1,
        poolId: 'heavy',
      },
      {
        id: 'adama-resurrection-ship-destroyed-01',
        speaker: 'adama',
        trigger: 'ResurrectionShipDestroyed',
        text: 'Down.',
        weight: 1,
        cooldownSeconds: 30,
        priority: 'normal',
        chance: 1,
        poolId: 'down',
      },
    ];
    const comms = new Banter(stream(0), lines);
    const hit: DomainEvent = { type: 'FleetHit', damage: 1, integrity: 99, x: 1, shipId: 0, kind: 'stray' };
    comms.observe([hit], quiet);
    expect(comms.line).toMatchObject({ speakerName: 'Gaeta', text: 'Logged.' });

    comms.advance(20);
    const spawned: DomainEvent = {
      type: 'RaiderSpawned',
      id: 2,
      identityId: 2,
      x: 0,
      y: 0,
      returned: false,
      deaths: 0,
      heavy: false,
    };
    comms.observe([spawned], quiet);
    expect(comms.line).toBeNull();
    comms.observe([{ ...spawned, returned: true, deaths: 1 }], quiet);
    expect(comms.line).toMatchObject({ speakerName: 'Starbuck', text: 'Back.' });

    comms.advance(20);
    // A heavy Raider's arrival is the moment the big-Raider lines were written for (ADR-0002 3.3).
    comms.observe([{ ...spawned, id: 3, identityId: 3, heavy: true }], quiet);
    expect(comms.line).toMatchObject({ speakerName: 'Adama', text: 'Heavy.' });

    comms.advance(20);
    const destroyed: DomainEvent = { type: 'ResurrectionShipDestroyed', x: 0, y: 0 };
    comms.observe([destroyed], quiet);
    expect(comms.line).toMatchObject({ speakerName: 'Adama', text: 'Down.' });
  });

  it('lets a hull warning replace a joke, and a later spool call replace the earlier one', () => {
    const lines: BanterLine[] = [
      {
        id: 'starbuck-missile-01',
        speaker: 'starbuck',
        trigger: 'MissileLaunched',
        text: 'Catch.',
        weight: 1,
        cooldownSeconds: 15,
        priority: 'flavor',
        chance: 1,
        poolId: 'missile',
      },
      {
        id: 'tigh-hull-low-01',
        speaker: 'tigh',
        trigger: 'HullLow',
        text: 'Thin.',
        weight: 1,
        cooldownSeconds: 25,
        priority: 'normal',
        chance: 1,
        poolId: 'hull',
      },
      {
        id: 'gaeta-ftl-spool-progress-01',
        speaker: 'gaeta',
        trigger: 'FtlSpoolProgress',
        text: 'Eight.',
        weight: 1,
        cooldownSeconds: 10,
        priority: 'critical',
        chance: 1,
        poolId: 'spool-a',
      },
      {
        id: 'gaeta-ftl-spool-progress-02',
        speaker: 'gaeta',
        trigger: 'FtlSpoolProgress',
        text: 'Five.',
        weight: 1,
        cooldownSeconds: 10,
        priority: 'critical',
        chance: 1,
        poolId: 'spool-b',
      },
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([missile], quiet);
    expect(comms.mention('HullLow', quiet)).toBe(true);
    expect(comms.line?.text).toBe('Thin.');
    expect(comms.mention('HullLow', quiet)).toBe(false);

    comms.advance(30);
    comms.observe([spool], { ...quiet, spoolPercent: 0 });
    expect(comms.line?.text).toBe('Eight.');
    expect(comms.mention('FtlSpoolProgress', { ...quiet, secondsRemaining: 5, spoolPercent: 40 })).toBe(true);
    expect(comms.line?.text).toBe('Five.');
  });

  it('says the factory percent, not the spool percent', () => {
    const lines: BanterLine[] = [
      {
        id: 'gaeta-resurrection-ship-milestone-01',
        speaker: 'gaeta',
        trigger: 'ResurrectionShipMilestone',
        text: 'At {percent}.',
        weight: 1,
        cooldownSeconds: 15,
        priority: 'normal',
        chance: 1,
        poolId: 'mark',
      },
    ];
    const comms = new Banter(stream(0), lines);
    expect(comms.mention('ResurrectionShipMilestone', { ...quiet, spoolPercent: 10, shipPercent: 75 })).toBe(true);
    expect(comms.line?.text).toBe('At 75.');
  });
});

function pool(speaker: BanterLine['speaker'], trigger: BanterLine['trigger'], priority: BanterLine['priority'], texts: readonly string[], cooldownSeconds = 15): BanterLine[] {
  return texts.map((text, index) => ({
    id: `${speaker}-${trigger}-${String(index)}`,
    speaker,
    trigger,
    text,
    weight: 1,
    cooldownSeconds,
    priority,
    chance: 1,
    poolId: `${speaker}:${trigger}`,
  }));
}

const fleetHit: DomainEvent = { type: 'FleetHit', damage: 1, integrity: 99, x: 1, shipId: 0, kind: 'stray' };
const returned: DomainEvent = {
  type: 'RaiderSpawned',
  id: 2,
  identityId: 2,
  x: 0,
  y: 0,
  returned: true,
  deaths: 1,
  heavy: false,
};

/** Runs the strip until it is empty, and returns how long that took. */
function waitForSilence(comms: Banter): number {
  let seconds = 0;
  while (comms.line !== null && seconds < 30) {
    comms.advance(0.1);
    seconds += 0.1;
  }
  return seconds;
}

describe('Banter pacing', () => {
  it('keeps a quiet gap after a line, and only a critical call speaks into it', () => {
    const lines = [
      ...pool('gaeta', 'FleetHit', 'normal', ['Logged.'], 0),
      ...pool('gaeta', 'FtlSpoolProgress', 'critical', ['Spooling.'], 0),
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([fleetHit], quiet);
    waitForSilence(comms);

    comms.advance(COMMS_GAP_SECONDS - 0.5);
    comms.observe([fleetHit], quiet);
    expect(comms.line).toBeNull();

    comms.observe([spool], quiet);
    expect(comms.line?.text).toBe('Spooling.');
    waitForSilence(comms);

    comms.advance(COMMS_GAP_SECONDS + 0.1);
    comms.observe([fleetHit], quiet);
    expect(comms.line?.text).toBe('Logged.');
  });

  it('measures the gap from when the line ran out, even across one long step', () => {
    const comms = new Banter(stream(0), pool('gaeta', 'FleetHit', 'normal', ['Logged.'], 0));
    comms.observe([fleetHit], quiet);
    comms.advance(commsDurationSeconds('Logged.') + COMMS_GAP_SECONDS + 0.1);
    comms.observe([fleetHit], quiet);
    expect(comms.line?.text).toBe('Logged.');
  });

  it('lets a new cycle open at once, even inside the last cycle’s gap', () => {
    const lines = [
      ...pool('gaeta', 'FleetHit', 'normal', ['Logged.'], 0),
      ...pool('adama', 'CycleStarted', 'normal', ['Hold the line.'], 0),
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([fleetHit], quiet);
    waitForSilence(comms);
    comms.observe([arrived], quiet);
    expect(comms.line?.text).toBe('Hold the line.');
  });

  it('allows a few flavor lines per cycle, then only normal lines, until the next cycle', () => {
    const lines = [
      ...pool('starbuck', 'MissileLaunched', 'flavor', ['Catch.'], 0),
      ...pool('gaeta', 'FleetHit', 'normal', ['Logged.'], 0),
    ];
    const comms = new Banter(stream(0), lines);
    const speakAfterGap = (events: DomainEvent[]): string | null => {
      waitForSilence(comms);
      comms.advance(COMMS_GAP_SECONDS + 0.1);
      comms.observe(events, quiet);
      return comms.line?.text ?? null;
    };
    for (let said = 0; said < FLAVOR_LINES_PER_CYCLE; said++) expect(speakAfterGap([missile])).toBe('Catch.');
    expect(speakAfterGap([missile])).toBeNull();
    expect(speakAfterGap([fleetHit])).toBe('Logged.');

    comms.observe([arrived], quiet);
    expect(speakAfterGap([missile])).toBe('Catch.');
  });

  it('gives a flavor line a moment to be read, then lets a newer one take the strip', () => {
    const lines = [
      ...pool('starbuck', 'MissileLaunched', 'flavor', ['Catch.']),
      ...pool('starbuck', 'RaiderResurrected', 'flavor', ['Back again.']),
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([missile], quiet);
    comms.advance(COMMS_MIN_SHOWN_SECONDS - 0.5);
    comms.observe([returned], quiet);
    expect(comms.line?.text).toBe('Catch.');

    comms.advance(1);
    comms.observe([returned], quiet);
    expect(comms.line?.text).toBe('Back again.');
  });

  it('never lets a joke or another report push a report off the strip', () => {
    const lines = [
      ...pool('gaeta', 'FleetHit', 'normal', ['Logged.']),
      ...pool('starbuck', 'MissileLaunched', 'flavor', ['Catch.']),
      ...pool('adama', 'SpecialUsed', 'normal', ['Good speech.']),
    ];
    const comms = new Banter(stream(0), lines);
    comms.observe([fleetHit], quiet);
    comms.advance(COMMS_MIN_SHOWN_SECONDS + 1);
    comms.observe([missile], quiet);
    expect(comms.line?.text).toBe('Logged.');
    comms.observe([speech], quiet);
    expect(comms.line?.text).toBe('Logged.');
  });

  it('does not let a speaker answer the same moment with another joke until the cooldown ends', () => {
    const comms = new Banter(stream(0), pool('starbuck', 'MissileLaunched', 'flavor', ['Catch.', 'Fox two.', 'Boom.'], 15));
    comms.observe([missile], quiet);
    waitForSilence(comms);
    comms.advance(COMMS_GAP_SECONDS + 1);
    comms.observe([missile], quiet);
    expect(comms.line).toBeNull();

    comms.advance(15);
    comms.observe([missile], quiet);
    expect(comms.line).not.toBeNull();
  });

  it('picks one responder per moment, and a quieter speaker can win it', () => {
    const lines = [
      ...pool('gaeta', 'FleetHit', 'normal', ['Logged.']),
      ...pool('tigh', 'FleetHit', 'flavor', ['Frak.']),
    ];
    const low = new Banter(stream(0), lines);
    low.observe([fleetHit], quiet);
    expect(low.line?.speakerName).toBe('Gaeta');

    const high = new Banter(stream(0.99), lines);
    high.observe([fleetHit], quiet);
    expect(high.line?.speakerName).toBe('Tigh');
  });
});
