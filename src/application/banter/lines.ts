import adama from '../../content/banter/adama.json';
import dualla from '../../content/banter/dualla.json';
import gaeta from '../../content/banter/gaeta.json';
import starbuck from '../../content/banter/starbuck.json';
import tyrol from '../../content/banter/tyrol.json';

/** Speakers the overlay knows how to name. Matches the content schema roster we ship lines for. */
const SPEAKERS = ['adama', 'starbuck', 'gaeta', 'dualla', 'tyrol'] as const;

export type BanterSpeaker = (typeof SPEAKERS)[number];

const TRIGGERS = [
  'CycleStarted',
  'FtlSpoolProgress',
  'ResurrectionShipArrived',
  'SpecialUsed',
  'RunWon',
  'FleetLost',
  'CycleRecovering',
  'MissileLaunched',
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
}

const SPEAKER_NAMES: Record<BanterSpeaker, string> = {
  adama: 'Adama',
  starbuck: 'Starbuck',
  gaeta: 'Gaeta',
  dualla: 'Dualla',
  tyrol: 'Tyrol',
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
  return {
    id: record.id,
    speaker: record.speaker,
    trigger: record.trigger,
    text: record.text,
    weight: record.weight,
    cooldownSeconds: record.cooldownSeconds,
    priority: record.priority,
  };
}

function parseFile(raw: unknown): BanterLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const line = parseBanterLine(entry);
    return line === null ? [] : [line];
  });
}

/** Lines shipped with the game. Invalid entries are dropped at load. */
export const BANTER_LINES: readonly BanterLine[] = [
  ...parseFile(adama),
  ...parseFile(gaeta),
  ...parseFile(dualla),
  ...parseFile(tyrol),
  ...parseFile(starbuck),
];
