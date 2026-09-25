import type { TierId } from '../domain/balance/profile';
import { cardDefinition, isCardId, maxStacksFor, type CardId } from '../domain/progression/catalog';
import { ENDING_ID_PATTERN } from './endings';
import { openLink, sealLink } from './linkSeal';
import type { RunResult } from './runResult';

/**
 * A finished run as a URL fragment (PRD 17). Inside is a small query, `v=1&g=0.1.0&o=won&...`,
 * sealed by `linkSeal` so the link reads `#r=kX9...` and a hand edit breaks it. The fragment never
 * reaches a server, and it carries the result itself, so there is nothing to store and nothing that
 * names a person. The seal can be forged by anyone who reads the source, so reading a payload is
 * still strict: a malformed or out-of-range field rejects the whole link, and the page falls back
 * to the title. The score is not checked against the stats; a forged link only fools its reader.
 */
export interface SharedRun {
  readonly result: RunResult;
  /** The game version that played the run, shown so a score from old balance reads as old. */
  readonly gameVersion: string;
}

const FORMAT_VERSION = '1';
/** Far past a real link (about 300 characters sealed); anything longer is not ours. */
const MAX_LENGTH = 1000;
const VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const WHOLE = /^\d{1,7}$/;

const TIER_CODES: Record<TierId, string> = { 'civilian-ship': 'civilian', 'viper-pilot': 'pilot' };

/** The fragment for a finished run, without the `#`. */
export function encodeSharedRun(run: SharedRun): string {
  return sealLink(sharePayload(run));
}

/** The plain query inside the seal. Exported for tests that need to forge a sealed link. */
export function sharePayload({ result, gameVersion }: SharedRun): string {
  const fields: [string, string][] = [
    ['v', FORMAT_VERSION],
    ['g', gameVersion],
    ['o', result.outcome],
    ['t', TIER_CODES[result.tier]],
    ['s', String(result.score)],
    ['c', String(result.cycle)],
    ['k', String(result.raiderKills)],
    ['h', String(result.heavyKills)],
    ['e', String(result.ejects)],
    ['f', String(result.fleetLeftPercent)],
    ['r', String(result.resurrectionShipPercent)],
    ['l', result.headlineId],
  ];
  if (result.mostKilled) {
    const { identityId, kills, reaction } = result.mostKilled;
    fields.push(['m', `${String(identityId)}:${String(kills)}:${String(reaction)}`]);
  }
  if (result.cards.length > 0) {
    fields.push(['u', result.cards.map((card) => `${card.id}:${String(card.stacks)}`).join(',')]);
  }
  return fields.map(([key, value]) => `${key}=${value}`).join('&');
}

/** Rejects rather than repairs: a link that is not exactly what the game writes is not shown. */
class Rejected extends Error {}

function whole(value: string | undefined, min: number, max: number): number {
  if (value === undefined || !WHOLE.test(value)) throw new Rejected();
  const number = Number(value);
  if (number < min || number > max) throw new Rejected();
  return number;
}

function tierFromCode(code: string | undefined): TierId {
  const tier = (Object.keys(TIER_CODES) as TierId[]).find((id) => TIER_CODES[id] === code);
  if (!tier) throw new Rejected();
  return tier;
}

function mostKilled(value: string | undefined): RunResult['mostKilled'] {
  if (value === undefined) return null;
  const [identity, kills, reaction, extra] = value.split(':');
  if (extra !== undefined) throw new Rejected();
  // A reaction past the end of today's list is fine: the screen shows the first one instead.
  return { identityId: whole(identity, 0, 999_999), kills: whole(kills, 2, 99_999), reaction: whole(reaction, 0, 999) };
}

/**
 * Cards the game no longer has are dropped, so an old link still opens. A known card with an
 * impossible stack count, or listed twice, rejects the link.
 */
function cards(value: string | undefined): RunResult['cards'] {
  if (value === undefined) return [];
  const seen = new Set<string>();
  const held: { id: CardId; stacks: number }[] = [];
  for (const entry of value.split(',')) {
    const [id, stacks, extra] = entry.split(':');
    if (id === undefined || extra !== undefined || !/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id)) throw new Rejected();
    seen.add(id);
    if (!isCardId(id)) {
      whole(stacks, 1, 99);
      continue;
    }
    held.push({ id, stacks: whole(stacks, 1, maxStacksFor(cardDefinition(id).rarity)) });
  }
  return held;
}

function fields(code: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of code.split('&')) {
    const split = pair.indexOf('=');
    if (split <= 0) throw new Rejected();
    const key = pair.slice(0, split);
    if (map.has(key)) throw new Rejected();
    map.set(key, pair.slice(split + 1));
  }
  return map;
}

/**
 * Reads a location hash (with or without its `#`). Null for anything that is not a valid link,
 * including an empty hash, so callers can pass `location.hash` straight in.
 */
export function decodeSharedRun(hash: string): SharedRun | null {
  if (hash.length > MAX_LENGTH) return null;
  const payload = openLink(hash);
  if (payload === null) return null;
  try {
    const map = fields(payload);
    if (map.get('v') !== FORMAT_VERSION) return null;
    const gameVersion = map.get('g');
    if (gameVersion === undefined || !VERSION_PATTERN.test(gameVersion)) return null;
    const outcome = map.get('o');
    if (outcome !== 'won' && outcome !== 'lost') return null;
    const headlineId = map.get('l');
    if (headlineId === undefined || !ENDING_ID_PATTERN.test(headlineId)) return null;
    const result: RunResult = {
      outcome,
      tier: tierFromCode(map.get('t')),
      score: whole(map.get('s'), 0, 9_999_999),
      cycle: whole(map.get('c'), 1, 999),
      raiderKills: whole(map.get('k'), 0, 999_999),
      heavyKills: whole(map.get('h'), 0, 99_999),
      ejects: whole(map.get('e'), 0, 99_999),
      fleetLeftPercent: whole(map.get('f'), 0, 100),
      resurrectionShipPercent: whole(map.get('r'), 0, 100),
      mostKilled: mostKilled(map.get('m')),
      cards: cards(map.get('u')),
      headlineId,
    };
    // A win without the ship gone is not a run this game can produce.
    if (result.outcome === 'won' && result.resurrectionShipPercent !== 100) return null;
    return { result, gameVersion };
  } catch (error) {
    if (error instanceof Rejected) return null;
    throw error;
  }
}
