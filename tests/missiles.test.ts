import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import {
  MISSILE_CAPACITY,
  MISSILE_SHIP_DAMAGE,
  MISSILE_SPEED_UNITS_PER_SECOND,
} from '../src/domain/combat/missile';
import { isInForwardCone, pickMissileLock } from '../src/domain/combat/targeting';
import { movingCircleHitAlong } from '../src/domain/shared/collision';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import {
  CYCLE_COMBAT_SECONDS,
  JUMPING_SECONDS,
} from '../src/domain/cycle/jumpCycle';

function missilePress(): InputIntent {
  return { ...IDLE_INTENT, missile: true };
}

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function eventsOf(game: Game, ticks: number, intent: InputIntent = IDLE_INTENT): DomainEvent[] {
  const collected: DomainEvent[] = [];
  for (let i = 0; i < ticks; i++) collected.push(...game.tick(intent));
  return collected;
}

function createMissileGame() {
  return createGame({ seed: 1, raidersFire: false, viperFires: false });
}

describe('missile lock cone', () => {
  it('accepts a target straight up and rejects one behind', () => {
    expect(isInForwardCone(135, 370, 135, 100)).toBe(true);
    expect(isInForwardCone(135, 370, 135, 400)).toBe(false);
  });

  it('picks the nearest in the cone, and breaks a tie by lowest id', () => {
    const nearer = pickMissileLock(135, 370, [
      { id: 2, x: 135, y: 200 },
      { id: 1, x: 135, y: 80 },
    ]);
    expect(nearer?.id).toBe(2);

    const tied = pickMissileLock(135, 370, [
      { id: 8, x: 135, y: 100 },
      { id: 3, x: 135, y: 100 },
    ]);
    expect(tied?.id).toBe(3);
  });

  it('ignores a closer body that sits outside the cone', () => {
    const lock = pickMissileLock(135, 370, [
      { id: 1, x: 250, y: 360 },
      { id: 2, x: 135, y: 80 },
    ]);
    expect(lock?.id).toBe(2);
  });
});

describe('the missile rack', () => {
  it('starts at three, spends one per press, and ignores a fourth', () => {
    const game = createMissileGame();
    expect(game.view.missileAmmo).toBe(MISSILE_CAPACITY);

    const first = game.tick(missilePress());
    expect(first.some((event) => event.type === 'MissileFired')).toBe(true);
    expect(game.view.missileAmmo).toBe(2);
    expect(game.view.missiles).toHaveLength(1);

    game.tick(IDLE_INTENT);
    game.tick(missilePress());
    game.tick(IDLE_INTENT);
    game.tick(missilePress());
    expect(game.view.missileAmmo).toBe(0);

    const dry = game.tick(IDLE_INTENT);
    expect(dry.some((event) => event.type === 'MissileFired')).toBe(false);
    const empty = game.tick(missilePress());
    expect(empty.some((event) => event.type === 'MissileFired')).toBe(false);
    expect(game.view.missileAmmo).toBe(0);
  });

  it('does not dump the rack while the button stays down', () => {
    const game = createMissileGame();
    const held: DomainEvent[] = [];
    for (let i = 0; i < 12; i++) held.push(...game.tick(missilePress()));
    expect(held.filter((event) => event.type === 'MissileFired')).toHaveLength(1);
    expect(game.view.missileAmmo).toBe(2);
  });

  it('refills at the jump', () => {
    const game = createMissileGame();
    game.tick(missilePress());
    game.tick(IDLE_INTENT);
    game.tick(missilePress());
    expect(game.view.missileAmmo).toBe(1);

    eventsOf(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    expect(game.view.cycle.phase).toBe('recovering');
    expect(game.view.missileAmmo).toBe(MISSILE_CAPACITY);
    expect(game.view.missiles).toHaveLength(0);

    game.continueFromJump();
    expect(game.view.missileAmmo).toBe(MISSILE_CAPACITY);
  });
});

describe('a missile in the sky', () => {
  it('one-shots a Raider in the cone', () => {
    const game = createMissileGame();
    const raider = game.tick(IDLE_INTENT).find((event) => event.type === 'RaiderSpawned');
    expect(raider?.type).toBe('RaiderSpawned');

    // Sit under the nearest Raider so the lock is that body.
    const body = game.view.raiders[0];
    expect(body).toBeDefined();
    for (let i = 0; i < ticksFor(2); i++) {
      const delta = (body?.x ?? 0) - game.view.viper.x;
      game.tick({ ...IDLE_INTENT, moveX: Math.max(-1, Math.min(1, delta / 20)) });
    }

    game.tick(missilePress());
    const travel = (480 + 20) / MISSILE_SPEED_UNITS_PER_SECOND;
    const events = eventsOf(game, ticksFor(travel));
    expect(events.some((event) => event.type === 'RaiderDestroyed')).toBe(true);
    expect(game.view.kills).toBeGreaterThanOrEqual(1);
  });

  it('hits the first body on the path when two overlap the same flight', () => {
    const alongNear = movingCircleHitAlong(135, 300, 135, 40, 4, 135, 220, 8);
    const alongFar = movingCircleHitAlong(135, 300, 135, 40, 4, 135, 80, 16);
    expect(alongNear).not.toBeNull();
    expect(alongFar).not.toBeNull();
    expect(alongNear ?? 1).toBeLessThan(alongFar ?? 0);
  });

  it('chips the resurrection ship when it is the nearest lock', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      viperFires: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
      resurrectionShipHitPoints: 60,
    });
    // Fire on the next tick, while Raiders are still at the top: from the spawn the ship is nearer
    // than a body at y=14, so the lock is the factory. Waiting lets a dive steal the lock.
    game.tick(IDLE_INTENT);
    expect(game.view.missileLock?.id).toBe(0);

    const hpBefore = game.view.resurrectionShip?.hp ?? 0;
    game.tick(missilePress());
    const travel = (480 + 20) / MISSILE_SPEED_UNITS_PER_SECOND;
    eventsOf(game, ticksFor(travel));
    expect(game.view.resurrectionShip?.hp).toBe(hpBefore - MISSILE_SHIP_DAMAGE);
  });
});

describe('missile combat gates', () => {
  it('does not fire during Recovering', () => {
    const game = createMissileGame();
    eventsOf(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    expect(game.view.cycle.phase).toBe('recovering');
    const events = game.tick(missilePress());
    expect(events.some((event) => event.type === 'MissileFired')).toBe(false);
    expect(game.view.missileAmmo).toBe(MISSILE_CAPACITY);
  });

  it('does not treat a hold across Recovering as a fresh press', () => {
    const game = createMissileGame();
    eventsOf(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
    eventsOf(game, 5, missilePress());
    game.continueFromJump();
    const events = game.tick(missilePress());
    expect(events.some((event) => event.type === 'MissileFired')).toBe(false);
    expect(game.view.missileAmmo).toBe(MISSILE_CAPACITY);
  });
});
