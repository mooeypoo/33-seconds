import { describe, expect, it } from 'vitest';
import { VIPER_HULL_HIT_POINTS } from '../src/domain/combat/viper';
import { createGame, type Game } from '../src/domain/game';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { RAIDER_HIT_POINTS } from '../src/domain/swarm/raider';
import { RESURRECTION_SHIP_HIT_POINTS } from '../src/domain/swarm/resurrectionShip';

/** Hits that do not kill are facts too, for effects and sound (ADR-0002 3.4). */
function steerUnder(game: Game, x: number): DomainEvent[] {
  const moveX = Math.max(-1, Math.min(1, (x - game.view.viper.x) / 20));
  return [...game.tick({ ...IDLE_INTENT, moveX })];
}

describe('hit events', () => {
  it('reports each Raider hit that does not kill, then the kill, never both for one round', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    const target = game.view.raiders[0];
    const events: DomainEvent[] = [];
    for (let i = 0; i < TICKS_PER_SECOND * 10; i++) {
      const tick = steerUnder(game, game.view.raiders.find((raider) => raider.id === target?.id)?.x ?? game.view.viper.x);
      events.push(...tick.filter((event) => (event.type === 'RaiderHit' || event.type === 'RaiderDestroyed') && event.id === target?.id));
      if (tick.some((event) => event.type === 'RaiderDestroyed' && event.id === target?.id)) break;
    }
    expect(events.map((event) => event.type)).toEqual([
      ...Array.from({ length: RAIDER_HIT_POINTS - 1 }, () => 'RaiderHit'),
      'RaiderDestroyed',
    ]);
    const hulls = events.flatMap((event) => (event.type === 'RaiderHit' ? [event.hp] : []));
    expect(hulls).toEqual([RAIDER_HIT_POINTS - 1, RAIDER_HIT_POINTS - 2]);
  });

  it('says whether the resurrection ship took the round on its shield or its hull', () => {
    function firstShipHit(vulnerableCycle: number): DomainEvent | undefined {
      const game = createGame({
        seed: 1,
        raidersFire: false,
        resurrectionShipArrivesCycle: 1,
        resurrectionShipVulnerableCycle: vulnerableCycle,
      });
      game.tick(IDLE_INTENT);
      for (let i = 0; i < TICKS_PER_SECOND * 10; i++) {
        const hit = steerUnder(game, game.view.resurrectionShip?.x ?? 0).find((event) => event.type === 'ResurrectionShipHit');
        if (hit) return hit;
      }
      return undefined;
    }
    const onShield = firstShipHit(2);
    const onHull = firstShipHit(1);
    expect(onShield?.type === 'ResurrectionShipHit' && onShield.shielded).toBe(true);
    expect(onHull?.type === 'ResurrectionShipHit' && !onHull.shielded).toBe(true);
    // One gun round on the hull: one point down from full.
    expect(onHull?.type === 'ResurrectionShipHit' ? onHull.hp : null).toBe(RESURRECTION_SHIP_HIT_POINTS - 1);
  });

  it('reports each round the Viper survives, and the eject instead of a hit for the last', () => {
    const game = createGame({ seed: 1, viperFires: false });
    const hits: number[] = [];
    let ejectedInsteadOfHit = false;
    for (let i = 0; i < TICKS_PER_SECOND * 30 && !ejectedInsteadOfHit; i++) {
      const events = game.tick(IDLE_INTENT);
      for (const event of events) if (event.type === 'ViperHit') hits.push(event.hp);
      if (events.some((event) => event.type === 'ViperEjected')) {
        ejectedInsteadOfHit = !events.some((event) => event.type === 'ViperHit' && event.hp === 0);
      }
    }
    expect(hits).toEqual(Array.from({ length: VIPER_HULL_HIT_POINTS - 1 }, (_, index) => VIPER_HULL_HIT_POINTS - 1 - index));
    expect(ejectedInsteadOfHit).toBe(true);
  });
});
