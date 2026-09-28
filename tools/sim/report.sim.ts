import { it } from 'vitest';
import { CHALLENGE_PRESETS, WEEKLY_POOL, weeklyPairKey } from '../../src/balance/challenges';
import { TIER_PROFILES } from '../../src/balance/tiers';
import type { CycleProfile, TierId } from '../../src/domain/balance/profile';
import { BOTS } from './bots';
import { simulateRun, summarize, type Summary } from './runSim';

/**
 * `npm run sim`: every tier and every challenge (PRD 11.1) against every bot, over seeded runs, as one table (ADR-0001 D13).
 * SIM_RUNS sets the runs per row (default 60); SIM_CYCLES the cycle limit (default 12).
 * A report, not a test: it always passes, and prints what the numbers do.
 */
/** The app's TypeScript settings leave Node types out of `src`; this report only needs the env. */
declare const process: { readonly env: Readonly<Record<string, string | undefined>> };

const RUNS = Number(process.env.SIM_RUNS ?? 60);
const MAX_CYCLES = Number(process.env.SIM_CYCLES ?? 12);

function percent(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

function score(value: number | null): string {
  return value === null ? '-' : value.toFixed(0);
}

function row(tier: string, bot: string, summary: Summary): string {
  return [
    tier.padEnd(24),
    bot.padEnd(7),
    percent(summary.winRate).padStart(5),
    percent(summary.lossRate).padStart(5),
    percent(summary.timeoutRate).padStart(8),
    summary.medianCycles.toFixed(0).padStart(7),
    summary.medianMinutes.toFixed(1).padStart(8),
    summary.medianFleetLow.toFixed(0).padStart(10),
    summary.worstFleetLow.toFixed(0).padStart(6),
    summary.raidersOnScreen.toFixed(1).padStart(8),
    summary.medianKills.toFixed(0).padStart(6),
    summary.ejectsPerRun.toFixed(1).padStart(7),
    score(summary.medianScoreWon).padStart(10),
    score(summary.medianScoreLost).padStart(11),
  ].join(' ');
}

it(`balance report (${String(RUNS)} runs per row, up to ${String(MAX_CYCLES)} cycles)`, () => {
  const header = [
    'tier / challenge'.padEnd(24),
    'bot'.padEnd(7),
    'won'.padStart(5),
    'lost'.padStart(5),
    'timeout'.padStart(8),
    'cycles'.padStart(7),
    'minutes'.padStart(8),
    'fleet low'.padStart(10),
    'worst'.padStart(6),
    'raiders'.padStart(8),
    'kills'.padStart(6),
    'ejects'.padStart(7),
    'score won'.padStart(10),
    'score lost'.padStart(11),
  ].join(' ');
  const lines = [header, '-'.repeat(header.length)];
  const started = performance.now();
  const rows: [string, CycleProfile][] = [
    ...(Object.keys(TIER_PROFILES) as TierId[]).map((tier): [string, CycleProfile] => [tier, TIER_PROFILES[tier]]),
    ...Object.values(CHALLENGE_PRESETS).map((challenge): [string, CycleProfile] => [challenge.id, challenge.profile]),
  ];
  for (const [label, profile] of rows) {
    for (const [name, bot] of Object.entries(BOTS)) {
      const results = Array.from({ length: RUNS }, (_, index) =>
        simulateRun({ seed: index + 1, profile, bot, maxCycles: MAX_CYCLES }),
      );
      lines.push(row(label, name, summarize(results)));
    }
  }
  // Every pair the weekly challenge can get (PRD 11.1), against the hunter only: the bot that plays
  // to win is the one a too-hard week shows up in. The pool says to keep it winning a quarter of runs.
  lines.push('', 'weekly pairs (swarm+fleet), hunter bot only:');
  const hunter = BOTS.hunter;
  if (!hunter) throw new Error('the weekly rows need the hunter bot');
  for (const [pair, profile] of Object.entries(WEEKLY_POOL.profiles)) {
    if (pair === weeklyPairKey(WEEKLY_POOL.swarms[0] ?? '', WEEKLY_POOL.fleets[0] ?? '')) continue;
    const results = Array.from({ length: RUNS }, (_, index) =>
      simulateRun({ seed: index + 1, profile, bot: hunter, maxCycles: MAX_CYCLES }),
    );
    lines.push(row(pair, 'hunter', summarize(results)));
  }
  lines.push('', `minutes = combat time plus ~10 s per Recovering pick. Scores are medians; "lost" includes timeouts. ${((performance.now() - started) / 1000).toFixed(1)} s to simulate.`);
  // eslint-disable-next-line no-console -- printing the table is this report's whole job
  console.log(`\n${lines.join('\n')}\n`);
});
