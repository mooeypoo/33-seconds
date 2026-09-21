import { describe, expect, it } from 'vitest';
import { createGame } from '../src/domain/game';
import { VIPER_FIRE_INTERVAL_SECONDS } from '../src/domain/combat/projectile';
import { VIPER_HULL_HIT_POINTS, VIPER_RADIUS_UNITS } from '../src/domain/combat/viper';
import { RESURRECTION_SHIP_LOCK_ID } from '../src/domain/combat/missile';
import { CALL_WAITING_SECONDS_PER_STACK, CONTINUITY_CAP_PER_STACK, SPOILERS_DELAY_SECONDS_PER_STACK } from '../src/domain/progression/catalog';
import { FLEET_CYCLE_DAMAGE_CAP, Fleet } from '../src/domain/fleet/integrity';
import { Loadout } from '../src/domain/progression/loadout';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../src/domain/swarm/resurrection';
import { RAIDER_SPAWN_Y_UNITS } from '../src/domain/swarm/raider';
import type { DomainEvent } from '../src/domain/shared/events';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';

function ticksFor(seconds: number): number {
  return Math.ceil(seconds * TICKS_PER_SECOND);
}

function eventsOf(game: ReturnType<typeof createGame>, ticks: number, intent: InputIntent = IDLE_INTENT): DomainEvent[] {
  const collected: DomainEvent[] = [];
  for (let i = 0; i < ticks; i++) collected.push(...game.tick(intent));
  return collected;
}

function toRecovering(game: ReturnType<typeof createGame>): void {
  eventsOf(game, ticksFor(CYCLE_COMBAT_SECONDS + JUMPING_SECONDS));
  expect(game.view.cycle.phase).toBe('recovering');
}

describe('the Recovering table', () => {
  it('offers three unique cards, and the same seed offers the same table', () => {
    const first = createGame({ seed: 1, raidersFire: false });
    toRecovering(first);
    const offer = first.view.upgradeOffer;
    expect(offer?.cardIds).toHaveLength(3);
    expect(new Set(offer?.cardIds).size).toBe(3);
    expect(offer?.rerollAvailable).toBe(true);

    const second = createGame({ seed: 1, raidersFire: false });
    toRecovering(second);
    expect(second.view.upgradeOffer?.cardIds).toEqual(offer?.cardIds);
  });

  it('lets you Ask Baltar Again once, then not again', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    toRecovering(game);
    const before = game.view.upgradeOffer?.cardIds ?? [];

    const rerolled = game.rerollOffer();
    expect(rerolled.some((event) => event.type === 'UpgradeRerolled')).toBe(true);
    const after = game.view.upgradeOffer?.cardIds ?? [];
    expect(after).toHaveLength(3);
    expect(after).not.toEqual(before);
    expect(game.view.upgradeOffer?.rerollAvailable).toBe(false);

    expect(game.rerollOffer()).toEqual([]);
    expect(game.view.upgradeOffer?.cardIds).toEqual(after);
  });

  it('starts the next cycle only when a card on the table is picked', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    toRecovering(game);
    const cardId = game.view.upgradeOffer?.cardIds[0];
    expect(cardId).toBeDefined();

    expect(game.pickUpgrade('not-a-card')).toEqual([]);
    expect(game.view.cycle.phase).toBe('recovering');

    const events = game.pickUpgrade(cardId ?? '');
    expect(events.some((event) => event.type === 'UpgradePicked' && event.cardId === cardId)).toBe(true);
    expect(events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'arriving')).toBe(true);
    expect(game.view.cycle.cycleIndex).toBe(2);
    expect(game.view.upgradeOffer).toBeNull();
    expect(game.view.loadout.some((card) => card.id === cardId && card.stacks === 1)).toBe(true);
  });

  it('does not offer a card that is already at its stack cap', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['accidentally-wide', 'accidentally-wide', 'accidentally-wide'],
    });
    toRecovering(game);
    expect(game.view.upgradeOffer?.cardIds.includes('accidentally-wide')).toBe(false);
  });
});

function holdUnder(game: ReturnType<typeof createGame>, x: number): void {
  const delta = x - game.view.viper.x;
  const scaled = delta / 20;
  const moveX = scaled > 1 ? 1 : scaled < -1 ? -1 : scaled;
  game.tick({ ...IDLE_INTENT, moveX, moveY: 0 });
}

describe('starter card effects', () => {
  it('Bootleg Hooch shoots faster', () => {
    const sober = createGame({ seed: 1, raidersFire: false });
    const drunk = createGame({ seed: 1, raidersFire: false, startingCards: ['bootleg-hooch'] });
    const soberShots = eventsOf(sober, ticksFor(1)).filter(
      (event) => event.type === 'ShotFired' && event.owner === 'player',
    );
    const drunkShots = eventsOf(drunk, ticksFor(1)).filter(
      (event) => event.type === 'ShotFired' && event.owner === 'player',
    );
    expect(soberShots).toHaveLength(Math.floor(1 / VIPER_FIRE_INTERVAL_SECONDS));
    expect(drunkShots.length).toBeGreaterThan(soberShots.length);
  });

  it('Accidentally Wide grows the hurtbox', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['accidentally-wide'] });
    game.tick(IDLE_INTENT);
    expect(game.view.viper.scale).toBeGreaterThan(1);
    expect(game.view.viper.scale * VIPER_RADIUS_UNITS).toBeGreaterThan(VIPER_RADIUS_UNITS);
  });

  it('Your Call Is Important to Us lengthens a download', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['your-call-is-important-to-us'],
    });
    const before = game.view.kills;
    for (let i = 0; i < ticksFor(12); i++) {
      const target = game.view.raiders[0];
      holdUnder(game, target?.x ?? game.view.viper.x);
      if (game.view.kills > before) break;
    }
    expect(game.view.kills).toBeGreaterThan(before);
    const remaining = game.view.ghosts[0]?.remainingSeconds ?? 0;
    expect(remaining).toBeGreaterThan(RESURRECTION_DOWNLOAD_SECONDS);
    expect(remaining).toBeLessThanOrEqual(RESURRECTION_DOWNLOAD_SECONDS + CALL_WAITING_SECONDS_PER_STACK);
  });

  it('Personal Vendetta locks the resurrection ship even when a Raider is closer', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      viperFires: false,
      startingCards: ['personal-vendetta'],
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
    });
    game.tick(IDLE_INTENT);
    const raider = game.view.raiders[0];
    expect(raider).toBeDefined();
    for (let i = 0; i < ticksFor(2); i++) {
      const delta = (raider?.x ?? 0) - game.view.viper.x;
      game.tick({ ...IDLE_INTENT, moveX: Math.max(-1, Math.min(1, delta / 20)) });
    }
    expect(game.view.missileLock?.id).toBe(RESURRECTION_SHIP_LOCK_ID);
  });

  it('Overcompensating Cannon leaves a round alive after the first body', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['overcompensating-cannon'],
    });
    for (let i = 0; i < ticksFor(1); i++) {
      holdUnder(game, game.view.raiders[0]?.x ?? game.view.viper.x);
    }
    const hpBefore = game.view.raiders.map((raider) => raider.hp);
    let shotId = -1;
    for (let i = 0; i < ticksFor(4); i++) {
      const events = game.tick({
        ...IDLE_INTENT,
        moveX: Math.max(-1, Math.min(1, ((game.view.raiders[0]?.x ?? 0) - game.view.viper.x) / 20)),
      });
      const fired = events.find((event) => event.type === 'ShotFired' && event.owner === 'player');
      if (fired && fired.type === 'ShotFired' && shotId < 0) shotId = fired.id;
      const dented = game.view.raiders.some((raider, index) => raider.hp < (hpBefore[index] ?? 0));
      if ((dented || game.view.kills > 0) && shotId >= 0) {
        expect(game.view.projectiles.some((shot) => shot.id === shotId)).toBe(true);
        return;
      }
    }
    throw new Error('expected a piercing round to hit and keep flying');
  });

  it('Anyone Could Be a Cylon spends a save instead of ejecting', () => {
    const game = createGame({
      seed: 1,
      raidersFire: true,
      startingCards: ['anyone-could-be-a-cylon'],
    });
    let downloaded = false;
    for (let i = 0; i < ticksFor(20); i++) {
      const events = game.tick(IDLE_INTENT);
      if (events.some((event) => event.type === 'ViperDownloaded')) {
        downloaded = true;
        expect(game.view.viper.ejected).toBe(false);
        expect(game.view.viper.hp).toBe(VIPER_HULL_HIT_POINTS);
        expect(game.view.viper.cylonEye).toBe(true);
        break;
      }
      expect(events.some((event) => event.type === 'ViperEjected')).toBe(false);
    }
    expect(downloaded).toBe(true);
  });

  it('Continuity of Government tightens the fleet cycle cap', () => {
    const one = new Loadout(['continuity-of-government']);
    const two = new Loadout(['continuity-of-government', 'continuity-of-government']);
    const fleet = new Fleet();
    const cap = FLEET_CYCLE_DAMAGE_CAP * CONTINUITY_CAP_PER_STACK;
    let applied = 0;
    for (let i = 0; i < FLEET_CYCLE_DAMAGE_CAP + 20; i++) {
      applied += fleet.takeStray(135, one.fleetCycleDamageCap);
    }
    expect(applied).toBeCloseTo(cap);
    expect(applied).toBeLessThan(FLEET_CYCLE_DAMAGE_CAP);
    expect(two.fleetCycleDamageCap).toBeCloseTo(FLEET_CYCLE_DAMAGE_CAP * CONTINUITY_CAP_PER_STACK ** 2);
  });

  it('Spoilers puts the blip on the return column, and a shot delays the download', () => {
    const game = createGame({ seed: 1, raidersFire: false, startingCards: ['spoilers'] });
    const before = game.view.kills;
    for (let i = 0; i < ticksFor(12); i++) {
      const target = game.view.raiders[0];
      holdUnder(game, target?.x ?? game.view.viper.x);
      if (game.view.kills > before) break;
    }
    expect(game.view.kills).toBeGreaterThan(before);
    const ghost = game.view.ghosts[0];
    expect(ghost?.shootable).toBe(true);
    expect(ghost?.y).toBe(RAIDER_SPAWN_Y_UNITS);
    const remainingAtKill = ghost?.remainingSeconds ?? 0;

    let delayed = false;
    for (let i = 0; i < ticksFor(1); i++) {
      const events = game.tick({
        ...IDLE_INTENT,
        moveX: Math.max(-1, Math.min(1, ((ghost?.x ?? 0) - game.view.viper.x) / 20)),
      });
      const bump = events.find((event) => event.type === 'GhostDelayed');
      if (bump) {
        delayed = true;
        expect(bump.remainingSeconds).toBeGreaterThan(remainingAtKill);
        expect(game.view.ghosts[0]?.remainingSeconds ?? 0).toBeGreaterThan(
          remainingAtKill + SPOILERS_DELAY_SECONDS_PER_STACK - 0.5,
        );
        break;
      }
    }
    expect(delayed).toBe(true);
  });

  it('does not delay a ghost without Spoilers', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    const before = game.view.kills;
    for (let i = 0; i < ticksFor(12); i++) {
      const target = game.view.raiders[0];
      holdUnder(game, target?.x ?? game.view.viper.x);
      if (game.view.kills > before) break;
    }
    const ghost = game.view.ghosts[0];
    expect(ghost?.shootable).toBe(false);
    expect(ghost?.y).toBeGreaterThan(RAIDER_SPAWN_Y_UNITS);
    const remainingAtKill = ghost?.remainingSeconds ?? 0;

    for (let i = 0; i < ticksFor(0.5); i++) {
      const events = game.tick({
        ...IDLE_INTENT,
        moveX: Math.max(-1, Math.min(1, ((ghost?.x ?? 0) - game.view.viper.x) / 20)),
      });
      expect(events.some((event) => event.type === 'GhostDelayed')).toBe(false);
    }
    expect(game.view.ghosts[0]?.remainingSeconds ?? 0).toBeLessThan(remainingAtKill);
  });

  it('Spoilers stacks add more delay per shot', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      startingCards: ['spoilers', 'spoilers'],
    });
    const before = game.view.kills;
    for (let i = 0; i < ticksFor(12); i++) {
      const target = game.view.raiders[0];
      holdUnder(game, target?.x ?? game.view.viper.x);
      if (game.view.kills > before) break;
    }
    const remainingAtKill = game.view.ghosts[0]?.remainingSeconds ?? 0;
    let delayed = false;
    for (let i = 0; i < ticksFor(1); i++) {
      const ghostX = game.view.ghosts[0]?.x ?? game.view.viper.x;
      const events = game.tick({
        ...IDLE_INTENT,
        moveX: Math.max(-1, Math.min(1, (ghostX - game.view.viper.x) / 20)),
      });
      const bump = events.find((event) => event.type === 'GhostDelayed');
      if (bump) {
        delayed = true;
        expect(bump.remainingSeconds).toBeGreaterThan(remainingAtKill + SPOILERS_DELAY_SECONDS_PER_STACK);
        break;
      }
    }
    expect(delayed).toBe(true);
  });
});
