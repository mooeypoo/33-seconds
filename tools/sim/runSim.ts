import type { CycleProfile } from '../../src/domain/balance/profile';
import { createGame } from '../../src/domain/game';
import { SCORE_WEIGHTS } from '../../src/balance/scoring';
import { RunTally, scoreRun } from '../../src/domain/scoring/score';
import { PHONE_PLAYFIELD, type Playfield } from '../../src/domain/shared/world';
import type { Bot } from './bots';

/**
 * One headless run (ADR-0001 D13): a seeded game driven by a bot until it is won, lost, or hits the
 * cycle limit. Cards are picked by a seeded rule so builds vary across runs. No browser, no clock.
 */
export interface RunResult {
  readonly outcome: 'won' | 'lost' | 'timeout';
  readonly cycles: number;
  readonly combatSeconds: number;
  /** Lowest Fleet Integrity seen, 0..100. */
  readonly fleetLow: number;
  /** Mean live Raiders over combat ticks. */
  readonly raidersOnScreen: number;
  readonly kills: number;
  readonly ejects: number;
  /** The end-screen score (PRD 5.4). A timeout scores as a loss would. */
  readonly score: number;
}

export interface RunOptions {
  readonly seed: number;
  readonly profile: CycleProfile;
  readonly bot: Bot;
  readonly maxCycles?: number;
  readonly playfield?: Playfield;
}

const TICKS_PER_SECOND = 60;

export function simulateRun(options: RunOptions): RunResult {
  const maxCycles = options.maxCycles ?? 12;
  const game = createGame({ seed: options.seed, tierProfile: options.profile, playfield: options.playfield ?? PHONE_PLAYFIELD });
  let fleetLow = game.view.fleet.integrity;
  let combatTicks = 0;
  let raiderTicks = 0;
  let ejects = 0;
  let tick = 0;
  const tally = new RunTally();

  for (;;) {
    const view = game.view;
    if (view.cycle.phase === 'recovering') {
      if (view.cycle.cycleIndex >= maxCycles) return result('timeout');
      const offer = view.upgradeOffer?.cardIds ?? [];
      const pick = offer[(options.seed + view.cycle.cycleIndex) % Math.max(1, offer.length)];
      if (pick) game.pickUpgrade(pick);
      else game.continueFromJump();
      continue;
    }

    const events = game.tick(options.bot(view, tick));
    tally.note(events);
    tick += 1;
    const after = game.view;
    if (after.cycle.phase !== 'jumping' && after.cycle.phase !== 'recovering') {
      combatTicks += 1;
      raiderTicks += after.raiders.length;
    }
    fleetLow = Math.min(fleetLow, after.fleet.integrity);
    for (const event of events) {
      if (event.type === 'ViperEjected') ejects += 1;
      if (event.type === 'RunWon') return result('won');
      if (event.type === 'RunLost') return result('lost');
    }
  }

  function result(outcome: RunResult['outcome']): RunResult {
    const view = game.view;
    return {
      outcome,
      cycles: view.cycle.cycleIndex,
      combatSeconds: combatTicks / TICKS_PER_SECOND,
      fleetLow: Math.round(fleetLow),
      raidersOnScreen: combatTicks > 0 ? raiderTicks / combatTicks : 0,
      kills: view.kills,
      ejects,
      score: scoreRun(tally.facts(view, outcome === 'won'), SCORE_WEIGHTS),
    };
  }
}

export interface Summary {
  readonly runs: number;
  readonly winRate: number;
  readonly lossRate: number;
  readonly timeoutRate: number;
  readonly medianCycles: number;
  readonly medianMinutes: number;
  readonly medianFleetLow: number;
  readonly worstFleetLow: number;
  readonly raidersOnScreen: number;
  readonly medianKills: number;
  readonly ejectsPerRun: number;
  /** Median score of the won runs, or null with none. */
  readonly medianScoreWon: number | null;
  readonly medianScoreLost: number | null;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 1 ? (sorted[middle] ?? 0) : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function medianOrNull(values: readonly number[]): number | null {
  return values.length === 0 ? null : median(values);
}

/** Roughly how long a Recovering pick takes a person, for the run-length estimate (PRD 5.1: 8-12 s). */
const RECOVERING_SECONDS_ESTIMATE = 10;

export function summarize(results: readonly RunResult[]): Summary {
  const count = results.length || 1;
  const share = (outcome: RunResult['outcome']): number => results.filter((run) => run.outcome === outcome).length / count;
  return {
    runs: results.length,
    winRate: share('won'),
    lossRate: share('lost'),
    timeoutRate: share('timeout'),
    medianCycles: median(results.map((run) => run.cycles)),
    medianMinutes: median(results.map((run) => (run.combatSeconds + (run.cycles - 1) * RECOVERING_SECONDS_ESTIMATE) / 60)),
    medianFleetLow: median(results.map((run) => run.fleetLow)),
    worstFleetLow: Math.min(...results.map((run) => run.fleetLow)),
    raidersOnScreen: results.reduce((sum, run) => sum + run.raidersOnScreen, 0) / count,
    medianKills: median(results.map((run) => run.kills)),
    ejectsPerRun: results.reduce((sum, run) => sum + run.ejects, 0) / count,
    medianScoreWon: medianOrNull(results.filter((run) => run.outcome === 'won').map((run) => run.score)),
    medianScoreLost: medianOrNull(results.filter((run) => run.outcome !== 'won').map((run) => run.score)),
  };
}
