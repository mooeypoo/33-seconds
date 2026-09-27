import { describe, expect, it } from 'vitest';
import { createGame, type GameOptions } from '../src/domain/game';
import { GameSession, IDLE_INPUT } from '../src/application/GameSession';
import { BANTER_LINES } from '../src/application/banter/lines';
import { Viper, VIPER_HULL_HIT_POINTS } from '../src/domain/combat/viper';
import { DEFAULT_CYCLE_PROFILE } from '../src/domain/balance/defaultProfile';
import {
  LUCKY_COVER_MAX_SECONDS,
  LUCKY_COVER_SECONDS_PER_KILL_PER_STACK,
  WATER_FILTER_HULL_PER_STACK,
  WATER_FILTER_REPAIR_PER_STACK,
} from '../src/domain/progression/catalog';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';

type Game = ReturnType<typeof createGame>;

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function run(game: Game, ticks: number): DomainEvent[] {
  const collected: DomainEvent[] = [];
  for (let i = 0; i < ticks; i++) collected.push(...game.tick(IDLE_INTENT));
  return collected;
}

function toRecovering(game: Game): void {
  run(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
  expect(game.view.cycle.phase).toBe('recovering');
}

/** Steers under the nearest Raider for one tick, so the gun finds kills. */
function hunt(game: Game): DomainEvent[] {
  const viper = game.view.viper;
  const target = game.view.raiders.reduce<{ x: number; distance: number } | null>((best, raider) => {
    const distance = Math.abs(raider.x - viper.x);
    return best === null || distance < best.distance ? { x: raider.x, distance } : best;
  }, null);
  const moveX = target === null ? 0 : Math.max(-1, Math.min(1, (target.x - viper.x) / 20));
  return [...game.tick({ ...IDLE_INTENT, moveX })];
}

/** Integrity on the tick before the jump and right after its repair. */
function acrossTheJump(game: Game): { before: number; after: number } {
  let before = game.view.fleet.integrity;
  for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS); i++) {
    const events = game.tick(IDLE_INTENT);
    if (events.some((event) => event.type === 'FleetRepaired')) return { before, after: game.view.fleet.integrity };
    before = game.view.fleet.integrity;
  }
  throw new Error('no jump');
}

/** Flies cycles until `cycleIndex` has started, taking no card on the way. */
function toCycle(game: Game, cycleIndex: number): DomainEvent[] {
  let events: DomainEvent[] = [];
  while (game.view.cycle.cycleIndex < cycleIndex) {
    toRecovering(game);
    events = [...game.continueFromJump()];
  }
  return events;
}

/** The first seed whose first Recovering deals this card, so a test can pick it the real way. */
function seedDealing(cardId: string, options: GameOptions = {}): Game {
  for (let seed = 1; seed < 500; seed++) {
    const game = createGame({ ...options, seed });
    toRecovering(game);
    if (game.view.upgradeOffer?.cardIds.includes(cardId as never)) return game;
  }
  throw new Error(`no seed deals ${cardId}`);
}

describe("The Fleet's Water Filter", () => {
  it('mends more of the missing fleet at the jump, per stack', () => {
    const options = { seed: 1, raidersFire: false, fleetStartingIntegrity: 50 } as const;
    const repair = DEFAULT_CYCLE_PROFILE.fleetRepairOfMissing;
    for (const [stacks, cards] of [[0, []], [1, ['water-filter']], [2, ['water-filter', 'water-filter']]] as const) {
      const { before, after } = acrossTheJump(createGame({ ...options, startingCards: cards }));
      expect(after).toBeCloseTo(before + (100 - before) * (repair + stacks * WATER_FILTER_REPAIR_PER_STACK));
    }
  });

  it('never mends past a full fleet, however generous the tier', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      fleetStartingIntegrity: 10,
      tierProfile: { ...DEFAULT_CYCLE_PROFILE, fleetRepairOfMissing: 0.95 },
      startingCards: ['water-filter', 'water-filter'],
    });
    toRecovering(game);
    expect(game.view.fleet.integrity).toBeCloseTo(100);
  });

  it('launches a thinner Viper, and a download refills it only to the thinner hull', () => {
    const game = createGame({ seed: 1, startingCards: ['water-filter', 'anyone-could-be-a-cylon'] });
    const thinner = VIPER_HULL_HIT_POINTS - WATER_FILTER_HULL_PER_STACK;
    game.tick(IDLE_INTENT);
    expect(game.view.viper.hp).toBe(thinner);
    expect(game.view.viper.hpMax).toBe(thinner);

    let downloaded = false;
    for (let i = 0; i < ticksFor(25) && !downloaded; i++) {
      downloaded = game.tick(IDLE_INTENT).some((event) => event.type === 'ViperDownloaded');
    }
    expect(downloaded).toBe(true);
    expect(game.view.viper.hp).toBe(thinner);
  });

  it('takes the hull at the reset after the pick, not at once', () => {
    const game = seedDealing('water-filter', { raidersFire: false });
    expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS);
    game.pickUpgrade('water-filter');
    expect(game.view.viper.hpMax).toBe(VIPER_HULL_HIT_POINTS - WATER_FILTER_HULL_PER_STACK);
    expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS - WATER_FILTER_HULL_PER_STACK);
  });
});

describe("Starbuck's Lucky Streak", () => {
  it('a kill buys cover', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['lucky-streak'] });
    let killed = false;
    for (let i = 0; i < ticksFor(20) && !killed; i++) {
      killed = hunt(game).some((event) => event.type === 'RaiderDestroyed');
    }
    expect(killed).toBe(true);
    expect(game.view.viper.lucky).toBe(true);
  });

  it('never banks more than the cap after the last kill, even with two stacks and a fast gun', () => {
    const game = createGame({
      seed: 3,
      raidersFire: false,
      startingCards: ['lucky-streak', 'lucky-streak', 'bootleg-hooch', 'overcompensating-cannon'],
    });
    let ticksSinceKill = Infinity;
    let longest = 0;
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS); i++) {
      const events = hunt(game);
      ticksSinceKill = events.some((event) => event.type === 'RaiderDestroyed') ? 0 : ticksSinceKill + 1;
      if (game.view.viper.lucky) longest = Math.max(longest, ticksSinceKill);
    }
    expect(longest).toBeGreaterThanOrEqual(ticksFor(2 * LUCKY_COVER_SECONDS_PER_KILL_PER_STACK) - 2);
    expect(longest).toBeLessThanOrEqual(ticksFor(LUCKY_COVER_MAX_SECONDS));
  });

  it('takes no hull while covered', () => {
    const game = createGame({ seed: 2, startingCards: ['lucky-streak', 'bootleg-hooch'] });
    let coveredTicks = 0;
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS); i++) {
      const coveredBefore = game.view.viper.lucky;
      const hpBefore = game.view.viper.hp;
      const events = hunt(game);
      if (!coveredBefore) continue;
      coveredTicks += 1;
      expect(events.some((event) => event.type === 'ViperHit' || event.type === 'ViperEjected')).toBe(false);
      expect(game.view.viper.hp).toBe(hpBefore);
    }
    expect(coveredTicks).toBeGreaterThan(0);
  });

  it('is never lucky without the card', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    let kills = 0;
    for (let i = 0; i < ticksFor(CYCLE_COMBAT_SECONDS); i++) {
      kills += hunt(game).filter((event) => event.type === 'RaiderDestroyed').length;
      expect(game.view.viper.lucky).toBe(false);
    }
    expect(kills).toBeGreaterThan(0);
  });

  it('banks up to the cap, covers no one while ejected, and never cuts a longer cover short', () => {
    const ejected = new Viper();
    for (let hit = 0; hit < VIPER_HULL_HIT_POINTS; hit++) ejected.takeHit();
    ejected.addCover(LUCKY_COVER_SECONDS_PER_KILL_PER_STACK, LUCKY_COVER_MAX_SECONDS);
    expect(ejected.coverSeconds).toBe(0);

    const streak = new Viper();
    for (let kill = 0; kill < 5; kill++) streak.addCover(LUCKY_COVER_SECONDS_PER_KILL_PER_STACK, LUCKY_COVER_MAX_SECONDS);
    expect(streak.coverSeconds).toBe(LUCKY_COVER_MAX_SECONDS);

    const downloaded = new Viper();
    downloaded.absorbDownload(2);
    downloaded.addCover(LUCKY_COVER_SECONDS_PER_KILL_PER_STACK, LUCKY_COVER_MAX_SECONDS);
    expect(downloaded.coverSeconds).toBe(2);
  });
});

describe("Gaius' Lab", () => {
  it('drops the shield a cycle early', () => {
    const plain = createGame({ seed: 1, raidersFire: false });
    const lab = createGame({ seed: 1, raidersFire: false, startingCards: ['gaius-lab'] });
    toCycle(plain, 3);
    const events = toCycle(lab, 3);
    expect(plain.view.resurrectionShip?.shielded).toBe(true);
    expect(lab.view.resurrectionShip?.shielded).toBe(false);
    expect(events.some((event) => event.type === 'ResurrectionShipExposed')).toBe(true);
  });

  it('keeps the shield up in the cycle before, and never opens a ship that is not there yet', () => {
    const lab = createGame({ seed: 1, raidersFire: false, startingCards: ['gaius-lab'] });
    toCycle(lab, 2);
    expect(lab.view.resurrectionShip?.shielded).toBe(true);

    const late = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['gaius-lab'],
      resurrectionShipArrivesCycle: 3,
      resurrectionShipVulnerableCycle: 3,
    });
    toCycle(late, 2);
    expect(late.view.resurrectionShip).toBeNull();
    toCycle(late, 3);
    expect(late.view.resurrectionShip?.shielded).toBe(false);
  });

  it('is dealt only while it would still move the shield, rerolls included', () => {
    const dealtAt = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      const game = createGame({ seed, raidersFire: false });
      for (let recovery = 1; recovery <= 4; recovery++) {
        toRecovering(game);
        const first = game.view.upgradeOffer?.cardIds ?? [];
        game.rerollOffer();
        const second = game.view.upgradeOffer?.cardIds ?? [];
        if ([...first, ...second].includes('gaius-lab')) dealtAt.add(recovery);
        game.continueFromJump();
      }
    }
    // After cycle 3 the shield drops next cycle anyway; after that it is already down.
    expect(dealtAt.has(3)).toBe(false);
    expect(dealtAt.has(4)).toBe(false);
    expect(dealtAt.has(1) || dealtAt.has(2)).toBe(true);
  });
});

describe("Baltar takes the credit for Gaius' Lab", () => {
  const credit = BANTER_LINES.filter((line) => line.trigger === 'ShieldDroppedEarly').map((line) => line.text);
  const options = { raidersFire: false, resurrectionShipArrivesCycle: 1, resurrectionShipVulnerableCycle: 2 } as const;

  function heardCredit(session: GameSession): boolean {
    for (let frame = 0; frame < TICKS_PER_SECOND * 25; frame++) {
      session.advance(TICK_SECONDS);
      if (credit.includes(session.status.comms?.text ?? '')) return true;
    }
    return false;
  }

  it('once the shield is down and the strip is quiet', () => {
    // The lab opens a ship that arrives in cycle 1, so no exposed event is sent. He still notices.
    const session = new GameSession(IDLE_INPUT, { ...options, startingCards: ['gaius-lab'] });
    session.start();
    expect(heardCredit(session)).toBe(true);
  });

  it('not without the card', () => {
    const session = new GameSession(IDLE_INPUT, { ...options, resurrectionShipVulnerableCycle: 1 });
    session.start();
    expect(heardCredit(session)).toBe(false);
  });
});
