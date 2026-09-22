import adama from '../../content/banter/adama.json';
import baltar from '../../content/banter/baltar.json';
import dualla from '../../content/banter/dualla.json';
import gaeta from '../../content/banter/gaeta.json';
import roslin from '../../content/banter/roslin.json';
import six from '../../content/banter/six.json';
import starbuck from '../../content/banter/starbuck.json';
import tigh from '../../content/banter/tigh.json';
import tyrol from '../../content/banter/tyrol.json';

/** Speakers the overlay knows how to name. Matches the content schema roster. */
const SPEAKERS = ['adama', 'starbuck', 'gaeta', 'dualla', 'tigh', 'baltar', 'roslin', 'tyrol', 'six'] as const;

export type BanterSpeaker = (typeof SPEAKERS)[number];

const TRIGGERS = [
  'CycleStarted',
  'FtlSpoolProgress',
  'BigRaiderEntered',
  'ResurrectionShipArrived',
  'ResurrectionShipMilestone',
  'ResurrectionShipDestroyed',
  'RaiderResurrected',
  'MultiKill',
  'CloseCall',
  'MissileLaunched',
  'FleetHit',
  'HullLow',
  'KillDrought',
  'UpgradeOffered',
  'SpecialUsed',
  'FleetLost',
  'RunWon',
  'ImaginarySixActive',
  'CycleRecovering',
] as const;

export type BanterTrigger = (typeof TRIGGERS)[number];

export type BanterPriority = 'critical' | 'normal' | 'flavor';

export interface BanterLine {
  readonly id: string;
  readonly speaker: BanterSpeaker;
  readonly trigger: BanterTrigger;
  readonly text: string;
  readonly weight: number;
  readonly cooldownSeconds: number;
  readonly priority: BanterPriority;
  /** 1 means the pool is always eligible. Below 1, one banter roll gates the whole pool. */
  readonly chance: number;
  /** Lines expanded from one pool share this, so the chance roll happens once. */
  readonly poolId: string;
}

const SPEAKER_NAMES: Record<BanterSpeaker, string> = {
  adama: 'Adama',
  starbuck: 'Starbuck',
  gaeta: 'Gaeta',
  dualla: 'Dualla',
  tigh: 'Tigh',
  baltar: 'Baltar',
  roslin: 'Roslin',
  tyrol: 'Tyrol',
  six: 'Six',
};

/** Bubble length from the content schema. Longer than this is a writer's error, not a line. */
export const BANTER_TEXT_MAX_CHARACTERS = 72;

export function speakerName(speaker: BanterSpeaker): string {
  return SPEAKER_NAMES[speaker];
}

function isSpeaker(value: unknown): value is BanterSpeaker {
  return typeof value === 'string' && (SPEAKERS as readonly string[]).includes(value);
}

function isTrigger(value: unknown): value is BanterTrigger {
  return typeof value === 'string' && (TRIGGERS as readonly string[]).includes(value);
}

function isPriority(value: unknown): value is BanterPriority {
  return value === 'critical' || value === 'normal' || value === 'flavor';
}

/**
 * Hostile JSON becomes no line. A bad file must not throw during a run, and it must not show markup.
 */
export function parseBanterLine(raw: unknown): BanterLine | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (!isSpeaker(record.speaker) || !isTrigger(record.trigger) || !isPriority(record.priority)) return null;
  if (typeof record.text !== 'string' || record.text.length === 0 || record.text.length > BANTER_TEXT_MAX_CHARACTERS) {
    return null;
  }
  if (record.text.includes('<') || record.text.includes('>')) return null;
  if (typeof record.weight !== 'number' || record.weight <= 0) return null;
  if (typeof record.cooldownSeconds !== 'number' || record.cooldownSeconds < 0) return null;
  const chance = record.chance === undefined ? 1 : record.chance;
  if (typeof chance !== 'number' || chance < 0 || chance > 1) return null;
  return {
    id: record.id,
    speaker: record.speaker,
    trigger: record.trigger,
    text: record.text,
    weight: record.weight,
    cooldownSeconds: record.cooldownSeconds,
    priority: record.priority,
    chance,
    poolId: typeof record.poolId === 'string' && record.poolId.length > 0 ? record.poolId : record.id,
  };
}

/**
 * A speaker file is `{ speaker, pools }`. A flat array is still accepted so a test can pass one line.
 * A bad pool is dropped. The rest of the file still loads.
 */
export function parseBanterSource(raw: unknown): BanterLine[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      const line = parseBanterLine(entry);
      return line === null ? [] : [line];
    });
  }
  if (raw === null || typeof raw !== 'object') return [];
  const file = raw as Record<string, unknown>;
  if (!isSpeaker(file.speaker) || !Array.isArray(file.pools)) return [];
  const speaker = file.speaker;
  const lines: BanterLine[] = [];
  file.pools.forEach((pool, poolIndex) => {
    if (pool === null || typeof pool !== 'object') return;
    const record = pool as Record<string, unknown>;
    if (!isTrigger(record.trigger) || !isPriority(record.priority)) return;
    if (typeof record.cooldownSeconds !== 'number' || record.cooldownSeconds < 0) return;
    const chance = record.chance === undefined ? 1 : record.chance;
    if (typeof chance !== 'number' || chance < 0 || chance > 1) return;
    if (!Array.isArray(record.lines)) return;
    const poolId = `${speaker}:${record.trigger}:${String(poolIndex)}`;
    for (const entry of record.lines) {
      if (entry === null || typeof entry !== 'object') continue;
      const line = entry as Record<string, unknown>;
      const weight = line.weight === undefined ? 1 : line.weight;
      const parsed = parseBanterLine({
        id: line.id,
        speaker,
        trigger: record.trigger,
        text: line.text,
        weight,
        cooldownSeconds: record.cooldownSeconds,
        priority: record.priority,
        chance,
        poolId,
      });
      if (parsed !== null) lines.push(parsed);
    }
  });
  return lines;
}

/** Lines shipped with the game. Invalid entries are dropped at load. */
export const BANTER_LINES: readonly BanterLine[] = [
  ...parseBanterSource(adama),
  ...parseBanterSource(starbuck),
  ...parseBanterSource(gaeta),
  ...parseBanterSource(dualla),
  ...parseBanterSource(tigh),
  ...parseBanterSource(baltar),
  ...parseBanterSource(roslin),
  ...parseBanterSource(tyrol),
  ...parseBanterSource(six),
];
