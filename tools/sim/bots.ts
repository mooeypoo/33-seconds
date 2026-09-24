import { IDLE_INTENT, type InputIntent } from '../../src/domain/shared/intent';
import type { GameView } from '../../src/domain/views';

/**
 * Headless pilots for the balance harness (ADR-0001 D13). Each is a few lines of steering, not a
 * good player: they bracket how the numbers feel to someone idle, someone chasing kills, and
 * someone guarding the fleet. Deterministic, so a seed replays the same run.
 */
export type Bot = (view: GameView, tick: number) => InputIntent;

/** How far off the target the steering reaches full speed, in world units. */
const STEER_SPAN_UNITS = 20;

function steer(from: number, to: number): number {
  return Math.max(-1, Math.min(1, (to - from) / STEER_SPAN_UNITS));
}

/** Presses on alternate ticks, so the domain sees a rising edge each time it matters. */
function tap(tick: number): boolean {
  return tick % 2 === 0;
}

/** Never touches the stick. Auto-fire still shoots whatever passes overhead. */
export const idleBot: Bot = () => IDLE_INTENT;

/** Sits under the nearest Raider and fires a missile when something is locked. */
export const hunterBot: Bot = (view, tick) => {
  const viper = view.viper;
  let target = view.raiders[0];
  for (const raider of view.raiders) {
    if (!target || Math.abs(raider.x - viper.x) < Math.abs(target.x - viper.x)) target = raider;
  }
  const ship = view.resurrectionShip;
  const aimX = target?.x ?? (ship && !ship.shielded && !ship.destroyed ? ship.x : viper.x);
  const wantsMissile = view.missileLock !== null && view.missileAmmo > 0 && tick % 90 < 2;
  return { ...IDLE_INTENT, moveX: steer(viper.x, aimX), moveY: 0, missile: wantsMissile && tap(tick) };
};

/** Stays low and moves under whatever is about to hit the fleet: a diver first, then a stray. */
export const guardBot: Bot = (view) => {
  const viper = view.viper;
  const diver = view.raiders.find((raider) => raider.strafing);
  let stray = null as (typeof view.projectiles)[number] | null;
  for (const shot of view.projectiles) {
    if (shot.owner !== 'cylon' || !shot.stray) continue;
    if (!stray || shot.y > stray.y) stray = shot;
  }
  const aimX = diver?.x ?? stray?.x ?? view.worldWidth / 2;
  const holdY = 380;
  return { ...IDLE_INTENT, moveX: steer(viper.x, aimX), moveY: steer(viper.y, holdY) };
};

export const BOTS: Readonly<Record<string, Bot>> = { idle: idleBot, hunter: hunterBot, guard: guardBot };
