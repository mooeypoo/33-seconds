import { challengeDetails, challengeName, verdictText } from '../../application/challenges';
import { endingFor, fillEnding, mostKilledLine } from '../../application/endings';
import type { RunResult } from '../../application/runResult';
import type { TierId } from '../../domain/balance/profile';
import { cardTitle } from '../cardTitles';

/**
 * The words of a finished run, shared by the end screen and the image it copies, so the two never
 * disagree. Everything here is built from numbers and ids; nothing a link carries becomes text.
 */
export interface RunSummaryText {
  readonly kicker: string;
  /** The tier for Story mode, or the challenge's name. */
  readonly tier: string;
  readonly headline: string;
  readonly text: string;
  readonly score: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly cards: readonly string[];
  /** The joke stat, or null when no Raider died twice. */
  readonly mostKilled: string | null;
  /** A challenge's one-line judgment of the run (PRD 11.1), or null for Story mode. */
  readonly verdict: string | null;
  /** What a weekly challenge changed. Empty otherwise. */
  readonly challengeDetails: readonly string[];
}

const TIER_NAMES: Record<TierId, string> = { 'civilian-ship': 'Civilian Run', 'viper-pilot': 'Viper Pilot' };

function count(value: number): string {
  return value.toLocaleString('en-US');
}

function shipLine(result: RunResult): string {
  if (result.resurrectionShipPercent >= 100) return 'Destroyed';
  if (result.resurrectionShipPercent === 0) return 'Untouched';
  return `${String(result.resurrectionShipPercent)}% down`;
}

export function summarizeRun(result: RunResult): RunSummaryText {
  const ending = endingFor(result.outcome, result.headlineId);
  const values = { score: result.score, cycles: result.cycle };
  const stats = [
    { label: 'Reached cycle', value: count(result.cycle) },
    { label: 'Raiders destroyed', value: count(result.raiderKills) },
    { label: 'Resurrection ship', value: shipLine(result) },
    { label: 'Fleet left', value: `${String(result.fleetLeftPercent)}%` },
    { label: 'Ejects', value: count(result.ejects) },
  ];
  if (result.heavyKills > 0) stats.splice(2, 0, { label: 'Heavy Raiders', value: count(result.heavyKills) });
  return {
    kicker: result.outcome === 'won' ? 'Fleet saved' : 'Fleet lost',
    tier: result.challenge ? challengeName(result.challenge.key) : TIER_NAMES[result.tier],
    headline: fillEnding(ending.headline, values),
    text: fillEnding(ending.text, values),
    score: count(result.score),
    stats,
    cards: result.cards.map((card) => (card.stacks > 1 ? `${cardTitle(card.id)} ×${String(card.stacks)}` : cardTitle(card.id))),
    mostKilled: result.mostKilled
      ? mostKilledLine(result.mostKilled.identityId, result.mostKilled.kills, result.mostKilled.reaction)
      : null,
    verdict: result.challenge ? verdictText(result.challenge, result.score, result.cycle) : null,
    challengeDetails: result.challenge ? challengeDetails(result.challenge.key) : [],
  };
}
