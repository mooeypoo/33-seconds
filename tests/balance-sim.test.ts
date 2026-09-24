import { describe, expect, it } from 'vitest';
import { TIER_PROFILES } from '../src/balance/tiers';
import { rampAt } from '../src/domain/balance/profile';
import { createGame } from '../src/domain/game';
import { BOTS, idleBot } from '../tools/sim/bots';
import { simulateRun } from '../tools/sim/runSim';

/**
 * Properties the tier numbers must keep, checked through the headless harness (ADR-0001 D13).
 * Few seeds and short runs, so this stays quick; `npm run sim` is the full report.
 */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('the balance harness', () => {
  it('replays the same run from the same seed', () => {
    const first = simulateRun({ seed: 42, profile: TIER_PROFILES['viper-pilot'], bot: BOTS.hunter ?? idleBot, maxCycles: 5 });
    const second = simulateRun({ seed: 42, profile: TIER_PROFILES['viper-pilot'], bot: BOTS.hunter ?? idleBot, maxCycles: 5 });
    expect(second).toEqual(first);
  });

  it('never lets an idle pilot lose the fleet on Civilian Run (PRD 7.3)', () => {
    for (const seed of SEEDS) {
      const run = simulateRun({ seed, profile: TIER_PROFILES['civilian-ship'], bot: idleBot, maxCycles: 8 });
      expect(run.outcome, `seed ${String(seed)}`).not.toBe('lost');
    }
  });

  it('never has more Raiders up than the Director cap, or more heavies than their limit, whoever is flying', () => {
    for (const [tierId, profile] of Object.entries(TIER_PROFILES)) {
      for (const [botName, bot] of Object.entries(BOTS)) {
        const game = createGame({ seed: 3, tierProfile: profile });
        for (let tick = 0; tick < 60 * 70; tick++) {
          const view = game.view;
          if (view.cycle.phase === 'recovering') {
            const card = view.upgradeOffer?.cardIds[0];
            if (card) game.pickUpgrade(card);
            continue;
          }
          game.tick(bot(view, tick));
          const cap = rampAt(profile.directorCap, game.view.cycle.cycleIndex);
          const raiders = game.view.raiders.filter((raider) => raider.kind === 'raider').length;
          const heavies = game.view.raiders.length - raiders;
          expect(raiders, `${tierId} / ${botName}`).toBeLessThanOrEqual(cap);
          expect(heavies, `${tierId} / ${botName}`).toBeLessThanOrEqual(profile.heavyMax);
        }
      }
    }
  });
});
