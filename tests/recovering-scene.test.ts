import { describe, expect, it } from 'vitest';
import { GameSession, IDLE_INPUT } from '../src/application/GameSession';
import { BANTER_LINES } from '../src/application/banter/lines';
import { RECOVERING_SCENES, SCENE_CAP_SECONDS, ScenePlayer } from '../src/application/banter/recoveringScene';
import { Viper } from '../src/domain/combat/viper';
import { damageBand, WRECKED_FLEET_DAMAGE, WRECKED_HULL_LOST } from '../src/domain/cycle/damageBand';
import { Fleet, FLEET_DAMAGE_PER_STRAFE } from '../src/domain/fleet/integrity';
import { createRandomStream } from '../src/domain/shared/random';
import { TICK_SECONDS, TICKS_PER_SECOND } from '../src/domain/shared/time';

describe('damage bands', () => {
  it('calls a quiet cycle clean, a scrape rough, and a bad cycle wrecked', () => {
    expect(damageBand(0, 0, false)).toBe('clean');
    expect(damageBand(FLEET_DAMAGE_PER_STRAFE, 0, false)).toBe('rough');
    expect(damageBand(WRECKED_FLEET_DAMAGE, 0, false)).toBe('wrecked');
    expect(damageBand(0, WRECKED_HULL_LOST, false)).toBe('wrecked');
    expect(damageBand(0, 0, true)).toBe('wrecked');
  });

  it('remembers an ejection after the jump puts the pilot back', () => {
    const viper = new Viper();
    for (let hit = 0; hit < 5; hit++) viper.takeHit();
    viper.resetAtJump();
    expect(viper.hp).toBe(5);
    expect(viper.scarEjected).toBe(true);
    expect(damageBand(0, viper.scarHullLost, viper.scarEjected)).toBe('wrecked');
  });

  it('keeps the cycle damage after the repair wipes the live counter', () => {
    const fleet = new Fleet();
    fleet.takeStrafe(0);
    fleet.takeStrafe(0);
    fleet.repairAtJump();
    expect(fleet.view.damageThisCycle).toBe(0);
    expect(fleet.view.lastCycleDamage).toBe(FLEET_DAMAGE_PER_STRAFE * 2);
  });
});

describe('recovering scenes', () => {
  it('ships one scene for each band, and a wrecked scene still finishes inside 12 seconds', () => {
    expect(RECOVERING_SCENES.map((scene) => scene.bands[0])).toEqual(['clean', 'rough', 'wrecked']);

    const player = new ScenePlayer();
    const heard: string[] = [];
    player.start('wrecked', createRandomStream(1));
    let elapsed = 0;
    while (player.active && elapsed < SCENE_CAP_SECONDS + 1) {
      const text = player.line?.text;
      if (text && heard[heard.length - 1] !== text) heard.push(text);
      player.advance(TICK_SECONDS);
      elapsed += TICK_SECONDS;
    }
    expect(player.active).toBe(false);
    expect(elapsed).toBeLessThan(SCENE_CAP_SECONDS + 0.05);
    expect(heard).toEqual(RECOVERING_SCENES[2]?.beats.map((beat) => beat.text));
    expect(heard.length).toBe(4);
  });
});

describe('who are you talking to', () => {
  it('waits until the cycle-start line is gone, then asks', () => {
    const session = new GameSession(IDLE_INPUT, { raidersFire: false, startingCards: ['imaginary-six'] });
    session.start();
    const asked = BANTER_LINES.filter((line) => line.trigger === 'ImaginarySixActive').map((line) => line.text);

    let heard = false;
    for (let frame = 0; frame < TICKS_PER_SECOND * 20 && !heard; frame++) {
      session.advance(TICK_SECONDS);
      heard = asked.includes(session.status.comms?.text ?? '');
    }
    expect(heard).toBe(true);
  });
});
