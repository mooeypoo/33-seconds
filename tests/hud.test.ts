import { describe, expect, it } from 'vitest';
import { buildHudViewModel } from '../src/application/HudViewModel';
import { createGame, type Game } from '../src/domain/game';
import { CYCLE_COMBAT_SECONDS, JUMPING_SECONDS } from '../src/domain/cycle/jumpCycle';
import { IDLE_INTENT, type InputIntent } from '../src/domain/shared/intent';
import { TICKS_PER_SECOND } from '../src/domain/shared/time';

function ticksFor(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

function run(game: Game, seconds: number, intent: InputIntent = IDLE_INTENT): void {
  for (let i = 0; i < ticksFor(seconds); i++) game.tick(intent);
}

function holdUnder(game: Game, x: number): void {
  const moveX = Math.max(-1, Math.min(1, (x - game.view.viper.x) / 20));
  game.tick({ ...IDLE_INTENT, moveX });
}

describe('the objective line', () => {
  it('asks the player to hold before the resurrection ship arrives', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(buildHudViewModel(game.view).objective).toBe('hold');
  });

  it('says to hold while the ship is shielded, then to destroy it once the shield drops', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 2,
    });
    game.tick(IDLE_INTENT);
    expect(buildHudViewModel(game.view).objective).toBe('shielded');
    expect(buildHudViewModel(game.view).shipStatus).toBe('shielded');

    run(game, CYCLE_COMBAT_SECONDS + JUMPING_SECONDS);
    game.continueFromJump();
    expect(buildHudViewModel(game.view).objective).toBe('destroy');
  });

  it('turns to the last wave once the ship is down, and the loop reads offline', () => {
    const game = createGame({
      seed: 1,
      raidersFire: false,
      resurrectionShipArrivesCycle: 1,
      resurrectionShipVulnerableCycle: 1,
      resurrectionShipHitPoints: 1,
    });
    game.tick(IDLE_INTENT);
    for (let i = 0; i < ticksFor(8) && !game.view.resurrectionShip?.destroyed; i++) {
      holdUnder(game, game.view.resurrectionShip?.x ?? game.view.viper.x);
    }
    const hud = buildHudViewModel(game.view);
    expect(hud.shipStatus).toBe('destroyed');
    expect(hud.objective).toBe('last-wave');
    expect(hud.resurrectionsActive).toBe(false);
  });
});

describe('the jump bar', () => {
  it('fills across the 33 seconds and stays full through the jump and Recovering', () => {
    const game = createGame({ seed: 1, raidersFire: false });
    game.tick(IDLE_INTENT);
    expect(buildHudViewModel(game.view).cycleProgress).toBeLessThan(0.01);

    run(game, CYCLE_COMBAT_SECONDS / 2);
    expect(buildHudViewModel(game.view).cycleProgress).toBeCloseTo(0.5, 1);

    run(game, CYCLE_COMBAT_SECONDS / 2 + JUMPING_SECONDS);
    const recovering = buildHudViewModel(game.view);
    expect(recovering.cyclePhase).toBe('recovering');
    expect(recovering.cycleProgress).toBe(1);
  });
});
