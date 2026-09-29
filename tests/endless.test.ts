import { describe, expect, it } from 'vitest';
import { createGame, type GameOptions } from '../src/domain/game';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';

/**
 * The Endless challenge's rule (PRD 11.1): no resurrection ship. Everything else is the same fight,
 * so these tests are about what the missing ship changes, through `tick` and the view only.
 */
type Game = ReturnType<typeof createGame>;
const ENDLESS: GameOptions = { resurrectionShip: false };
const CYCLE_TICKS = (CYCLE_COMBAT_SECONDS + JUMPING_SECONDS) * TICKS_PER_SECOND;

/** Steers under the nearest Raider, so the gun finds kills. */
function hunt(game: Game): DomainEvent[] {
  const viper = game.view.viper;
  const nearest = game.view.raiders.reduce<number | null>(
    (best, raider) => (best === null || Math.abs(raider.x - viper.x) < Math.abs(best - viper.x) ? raider.x : best),
    null,
  );
  const moveX = nearest === null ? 0 : Math.max(-1, Math.min(1, (nearest - viper.x) / 20));
  return [...game.tick({ ...IDLE_INTENT, moveX })];
}

/** Flies whole cycles, hunting, taking no card; returns every event on the way. */
function flyCycles(game: Game, cycles: number): DomainEvent[] {
  const events: DomainEvent[] = [];
  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let i = 0; i < CYCLE_TICKS && game.view.cycle.phase !== 'recovering'; i++) events.push(...hunt(game));
    if (game.view.cycle.phase === 'recovering') events.push(...game.continueFromJump());
  }
  return events;
}

/** Integrity on the tick before the jump and right after its repair. */
function acrossTheJump(game: Game): { before: number; after: number } {
  let before = game.view.fleet.integrity;
  for (let i = 0; i < CYCLE_TICKS; i++) {
    const events = game.tick(IDLE_INTENT);
    if (events.some((event) => event.type === 'FleetRepaired')) return { before, after: game.view.fleet.integrity };
    before = game.view.fleet.integrity;
  }
  throw new Error('no jump');
}

describe('a repair that falls by cycle (Tyrol tires)', () => {
  it('mends by the share of the cycle that just ended, and the last share holds', () => {
    // A small cap keeps the fleet standing through four jumps, whatever the strafes do.
    const tierProfile = { ...DEFAULT_CYCLE_PROFILE, fleetCycleDamageCap: 10, fleetRepairOfMissing: [0.5, 0.25, 0] };
    const game = createGame({ ...ENDLESS, seed: 1, raidersFire: false, fleetStartingIntegrity: 60, tierProfile });
    const seen: { share: number; before: number; after: number }[] = [];
    for (let cycle = 1; cycle <= 4; cycle++) {
      const share = game.view.fleetRepair.share;
      seen.push({ share, ...acrossTheJump(game) });
      while (game.view.cycle.phase !== 'recovering') game.tick(IDLE_INTENT);
      game.continueFromJump();
    }
    expect(seen.map((jump) => jump.share)).toEqual([0.5, 0.25, 0, 0]);
    for (const { share, before, after } of seen) expect(after).toBeCloseTo(before + (100 - before) * share);
    expect(game.view.fleetRepair.changes).toBe(true);
  });

  it('is a steady share for a tier, and says so', () => {
    expect(createGame({ seed: 1 }).view.fleetRepair.changes).toBe(false);
  });
});

describe('a run with no resurrection ship', () => {
  it('never sees the ship, and keeps the download loop on every cycle', () => {
    const game = createGame({ ...ENDLESS, seed: 3, raidersFire: false });
    const events = flyCycles(game, 10);
    expect(game.view.cycle.cycleIndex).toBe(11);
    expect(events.some((event) => event.type === 'ResurrectionShipArrived')).toBe(false);
    expect(game.view.resurrectionShip).toBeNull();
    expect(game.view.resurrectionsActive).toBe(true);
    // Kills in cycle 11 still go back to the download, like cycle 1's.
    let killed = false;
    for (let i = 0; i < 20 * TICKS_PER_SECOND && !killed; i++) killed = hunt(game).some((event) => event.type === 'RaiderDestroyed' && !event.heavy);
    expect(killed).toBe(true);
    expect(game.view.ghosts.length).toBeGreaterThan(0);
  });

  it('cannot be won, only lost when the fleet falls', () => {
    const game = createGame({ ...ENDLESS, seed: 1, viperFires: false, fleetStartingIntegrity: 8 });
    const events = flyCycles(game, 3);
    expect(events.some((event) => event.type === 'RunWon')).toBe(false);
    expect(events.some((event) => event.type === 'RunLost')).toBe(true);
  });

  it("never deals Gaius' Lab: there is no shield for it to drop", () => {
    // 30 seeds: without the rule, the lab shows up in the first two offers of several of them.
    for (let seed = 1; seed <= 30; seed++) {
      const game = createGame({ ...ENDLESS, seed, raidersFire: false });
      for (let recovery = 1; recovery <= 2; recovery++) {
        for (let i = 0; i < CYCLE_TICKS && game.view.cycle.phase !== 'recovering'; i++) game.tick(IDLE_INTENT);
        const first = game.view.upgradeOffer?.cardIds ?? [];
        game.rerollOffer();
        const second = game.view.upgradeOffer?.cardIds ?? [];
        expect([...first, ...second], `seed ${String(seed)}`).not.toContain('gaius-lab');
        game.continueFromJump();
      }
    }
  });
});
