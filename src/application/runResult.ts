import type { TierId } from '../domain/balance/profile';
import type { CardId } from '../domain/progression/catalog';
import { scoreRun, type RunFacts, type ScoreWeights } from '../domain/scoring/score';
import type { GameView } from '../domain/views';
import type { ChallengeTag } from './challenges';
import type { RunOutcome } from './endings';

/**
 * What the end screen shows and what a share link carries (PRD 5.4, 17): numbers and ids only. No
 * seed, no name, no free text. The headline is an id into `endings.json`, not the words.
 */
export interface RunResult {
  readonly outcome: RunOutcome;
  readonly tier: TierId;
  readonly score: number;
  /** The cycle the run ended in, from 1. */
  readonly cycle: number;
  readonly raiderKills: number;
  readonly heavyKills: number;
  readonly ejects: number;
  /** 0 to 100. */
  readonly fleetLeftPercent: number;
  /** How much of the resurrection ship's hull came off, 0 to 100. 100 is destroyed. */
  readonly resurrectionShipPercent: number;
  /** The Raider that died most often, and which reaction follows it (a position in `endings.json`). */
  readonly mostKilled: { readonly identityId: number; readonly kills: number; readonly reaction: number } | null;
  /** Cards held at the end, in the order they were last taken, with their stacks. */
  readonly cards: readonly { readonly id: CardId; readonly stacks: number }[];
  readonly headlineId: string;
  /** The challenge played and its verdict (PRD 11.1), or null for Story mode. */
  readonly challenge: ChallengeTag | null;
}

/** The result of the run in `view`, which should be the view on the tick it ended. */
export function buildRunResult(
  view: GameView,
  facts: RunFacts,
  weights: ScoreWeights,
  headlineId: string,
  reaction: number,
  challenge: ChallengeTag | null = null,
): RunResult {
  const ship = view.resurrectionShip;
  const shipPercent = facts.resurrectionShipDestroyed
    ? 100
    : ship && ship.hpMax > 0
      ? Math.min(99, Math.floor((facts.resurrectionShipDamage / ship.hpMax) * 100))
      : 0;
  const stacksOf = new Map(view.loadout.map((entry) => [entry.id, entry.stacks]));
  return {
    outcome: facts.won ? 'won' : 'lost',
    tier: view.tier,
    score: scoreRun(facts, weights),
    cycle: facts.cycle,
    raiderKills: facts.raiderKills,
    heavyKills: facts.heavyKills,
    ejects: facts.ejects,
    fleetLeftPercent: facts.fleetLeftPercent,
    resurrectionShipPercent: shipPercent,
    mostKilled: facts.mostKilled ? { ...facts.mostKilled, reaction } : null,
    cards: view.upgradeOrder.map((id) => ({ id, stacks: stacksOf.get(id) ?? 1 })),
    headlineId,
    challenge,
  };
}
