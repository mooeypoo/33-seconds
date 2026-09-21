import { describe, expect, it } from 'vitest';
import { createGame, type Game } from '../src/domain/game';
import type { DomainEvent } from '../src/domain/shared/events';
import type { InputIntent } from '../src/domain/shared/intent';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { WORLD_HEIGHT_UNITS } from '../src/domain/shared/world';
import {
  BAY_OPEN_SECONDS,
  BAY_SEALED_SECONDS,
  ResurrectionShip,
  RESURRECTION_SHIP_DRIFT_RANGE_UNITS,
  RESURRECTION_SHIP_SPAWN_X_UNITS,
  RESURRECTION_SHIP_SPAWN_Y_UNITS,
} from '../src/domain/swarm/resurrectionShip';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../src/domain/swarm/resurrection';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function move(moveX: number, moveY: number): InputIntent {
  return { ...IDLE_INTENT, moveX, moveY };
}

function clampSteer(deltaUnits: number): number {
  if (deltaUnits === 0) return 0;
  const scaled = deltaUnits / 20;
  if (scaled > 1) return 1;
  if (scaled < -1) return -1;
  return scaled;
}

function tickToward(game: Game, x: number): DomainEvent[] {
  return [...game.tick(move(clampSteer(x - game.view.viper.x), 0))];
}

function runToRecovering(game: Game, columnX = 16): DomainEvent[] {
  const events: DomainEvent[] = [];
  for (let i = 0; i < ticksFor(40); i++) {
    events.push(...tickToward(game, columnX));
    if (game.view.cycle.phase === 'recovering') return events;
  }
  throw new Error('expected Recovering');
}

function shipGame(hitPoints = 1): Game {
  return createGame({
    seed: 1,
    raidersFire: false,
    resurrectionShipArrivesCycle: 1,
    resurrectionShipVulnerableCycle: 1,
    resurrectionShipHitPoints: hitPoints,
  });
}

function destroyShip(game: Game): DomainEvent[] {
  const events: DomainEvent[] = [];
  const shipX = game.view.resurrectionShip?.x ?? RESURRECTION_SHIP_SPAWN_X_UNITS;
  for (let i = 0; i < ticksFor(8); i++) {
    events.push(...tickToward(game, shipX));
    if (game.view.resurrectionShip?.destroyed) return events;
  }
  throw new Error('expected the resurrection ship to go down');
}

function destroyOneRaider(game: Game): DomainEvent[] {
  const events: DomainEvent[] = [];
  const before = game.view.kills;
  for (let i = 0; i < ticksFor(10); i++) {
    const target = game.view.raiders.find((raider) => !raider.protected) ?? game.view.raiders[0];
    events.push(...tickToward(game, target?.x ?? game.view.viper.x));
    if (game.view.kills > before) return events;
  }
  throw new Error('expected a Raider kill');
}

describe('the resurrection ship', () => {
  it('stays out of the first cycles, then jumps in when asked', () => {
    const later = createGame({ seed: 1, raidersFire: false });
    later.tick(IDLE_INTENT);
    expect(later.view.resurrectionShip).toBeNull();
    expect(later.view.resurrectionsActive).toBe(true);

    const now = shipGame();
    const events = now.tick(IDLE_INTENT);
    expect(events.some((event) => event.type === 'ResurrectionShipArrived')).toBe(true);
    expect(now.view.resurrectionShip).toMatchObject({
      destroyed: false,
      shielded: false,
      hp: 1,
      y: RESURRECTION_SHIP_SPAWN_Y_UNITS,
    });
    expect(now.view.resurrectionShip?.y).toBeLessThan(WORLD_HEIGHT_UNITS * 0.18);
  });

  it('drifts slowly beside its station, not on a beat', () => {
    const game = shipGame();
    game.tick(IDLE_INTENT);
    const samples: number[] = [];
    for (let i = 0; i < ticksFor(8); i++) {
      game.tick(IDLE_INTENT);
      const x = game.view.resurrectionShip?.x ?? RESURRECTION_SHIP_SPAWN_X_UNITS;
      samples.push(x);
      expect(Math.abs(x - RESURRECTION_SHIP_SPAWN_X_UNITS)).toBeLessThanOrEqual(RESURRECTION_SHIP_DRIFT_RANGE_UNITS + 0.5);
    }
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(2);

    const replay = shipGame();
    replay.tick(IDLE_INTENT);
    for (let i = 0; i < ticksFor(8); i++) replay.tick(IDLE_INTENT);
    expect(replay.view.resurrectionShip?.x).toBe(game.view.resurrectionShip?.x);
  });

  it('arrives shielded, then drops the shield on the vulnerable cycle', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 2,
      resurrectionShipHitPoints: 8,
    });
    const arrived = game.tick(IDLE_INTENT);
    expect(arrived.some((event) => event.type === 'ResurrectionShipArrived')).toBe(true);
    expect(game.view.resurrectionShip?.shielded).toBe(true);
    expect(game.view.resurrectionShip?.baysOpen).toBe(false);
    expect(game.view.resurrectionShip?.hp).toBe(8);

    const shipX = game.view.resurrectionShip?.x ?? RESURRECTION_SHIP_SPAWN_X_UNITS;
    for (let i = 0; i < ticksFor(4); i++) tickToward(game, shipX);
    expect(game.view.resurrectionShip?.hp).toBe(8);
    expect(game.view.resurrectionShip?.shielded).toBe(true);

    runToRecovering(game);
    const exposed = [...game.continueFromJump()];
    expect(exposed.some((event) => event.type === 'ResurrectionShipExposed')).toBe(true);
    expect(game.view.resurrectionShip?.shielded).toBe(false);
    expect(game.view.resurrectionShip?.baysOpen).toBe(true);

    for (let i = 0; i < ticksFor(4); i++) {
      tickToward(game, shipX);
      if ((game.view.resurrectionShip?.hp ?? 8) < 8) break;
    }
    expect(game.view.resurrectionShip?.hp).toBeLessThan(8);
  });

  it('keeps its remaining HP across a jump', () => {
    const game = shipGame(8);
    game.tick(IDLE_INTENT);
    expect(game.view.resurrectionShip?.hp).toBe(8);

    const shipX = game.view.resurrectionShip?.x ?? RESURRECTION_SHIP_SPAWN_X_UNITS;
    for (let i = 0; i < ticksFor(6); i++) {
      tickToward(game, shipX);
      if ((game.view.resurrectionShip?.hp ?? 8) < 8) break;
    }
    expect(game.view.resurrectionShip?.hp).toBeLessThan(8);
    expect(game.view.resurrectionShip?.hp).toBeGreaterThan(0);

    runToRecovering(game);
    const hpAtJump = game.view.resurrectionShip?.hp;
    game.continueFromJump();
    expect(game.view.resurrectionShip?.hp).toBe(hpAtJump);
  });

  it('stops new downloads once it is gone, and the last wave still comes back', () => {
    const game = shipGame();
    game.tick(IDLE_INTENT);
    destroyOneRaider(game);
    expect(game.view.ghosts).toHaveLength(1);

    destroyShip(game);
    expect(game.view.resurrectionShip?.destroyed).toBe(true);
    expect(game.view.ghosts.length).toBeGreaterThan(0);

    for (let i = 0; i < ticksFor(RESURRECTION_DOWNLOAD_SECONDS) + 2; i++) game.tick(IDLE_INTENT);
    expect(game.view.raiders.some((raider) => raider.returned)).toBe(true);

    const ghostsBeforeLastKill = game.view.ghosts.length;
    destroyOneRaider(game);
    expect(game.view.ghosts).toHaveLength(ghostsBeforeLastKill);
    expect(game.view.resurrectionsActive).toBe(false);
  });

  it('does not treat a jump as clearing the last wave', () => {
    const game = shipGame();
    game.tick(IDLE_INTENT);
    const destroyEvents = destroyShip(game);
    expect(destroyEvents.some((event) => event.type === 'RunWon')).toBe(false);
    expect(game.view.raiders.length + game.view.ghosts.length).toBeGreaterThan(0);

    for (let i = 0; i < ticksFor(40); i++) {
      if (game.view.cycle.secondsRemaining <= 1 && game.view.cycle.phase === 'spooling') break;
      tickToward(game, 16);
    }
    const carried = game.view.raiders.map((raider) => raider.identityId);
    expect(carried.length + game.view.ghosts.length).toBeGreaterThan(0);

    const untilRecovering = runToRecovering(game);
    expect(untilRecovering.some((event) => event.type === 'RunWon')).toBe(false);
    expect(game.view.raiders).toHaveLength(0);

    const events = [...game.continueFromJump()];
    expect(events.some((event) => event.type === 'RunWon')).toBe(false);
    expect(game.view.raiders.length + game.view.ghosts.length).toBeGreaterThan(0);

    const backIds = [
      ...game.view.raiders.map((raider) => raider.identityId),
      ...game.view.ghosts.map((ghost) => ghost.identityId),
    ];
    expect(carried.every((id) => backIds.includes(id))).toBe(true);
  });

  it('wins only after the ship is gone and the sky is empty', () => {
    const game = shipGame();
    expect(game.tick(IDLE_INTENT).some((event) => event.type === 'RunWon')).toBe(false);

    const destroyEvents = destroyShip(game);
    expect(game.view.resurrectionShip?.destroyed).toBe(true);
    expect(destroyEvents.some((event) => event.type === 'RunWon')).toBe(false);
    expect(game.view.raiders.length + game.view.ghosts.length).toBeGreaterThan(0);

    let sawWin = false;
    for (let i = 0; i < ticksFor(20); i++) {
      const target = game.view.raiders.find((raider) => !raider.protected);
      const events = target ? tickToward(game, target.x) : [...game.tick(IDLE_INTENT)];
      if (events.some((event) => event.type === 'RunWon')) sawWin = true;
      if (sawWin) break;
    }

    expect(sawWin).toBe(true);
    expect(game.view.raiders).toHaveLength(0);
    expect(game.view.ghosts).toHaveLength(0);
  });
});

describe('hangar bays', () => {
  it('start open when the shield drops, then seal, then open again', () => {
    const ship = new ResurrectionShip(60, true);
    expect(ship.baysOpen).toBe(false);
    expect(ship.expose()).toBe(true);
    expect(ship.baysOpen).toBe(true);
    ship.advanceBays(BAY_OPEN_SECONDS);
    expect(ship.baysOpen).toBe(false);
    ship.advanceBays(BAY_SEALED_SECONDS);
    expect(ship.baysOpen).toBe(true);
  });

  it('do not walk during Recovering', () => {
    const game = shipGame(60);
    runToRecovering(game);
    const open = game.view.resurrectionShip?.baysOpen;
    expect(open).toBe(true);
    for (let i = 0; i < ticksFor(5); i++) game.tick(IDLE_INTENT);
    expect(game.view.resurrectionShip?.baysOpen).toBe(open);
  });
});
