import type { InjectionKey } from 'vue';
import type { GameSession } from '../application/GameSession';

/**
 * Presentation receives the session and the canvas hook from the composition root (`main.ts`).
 * It never reaches into the infrastructure layer itself, which the dependency check enforces.
 */
export const SESSION_KEY: InjectionKey<GameSession> = Symbol('session');

/** Called once with the element the canvas should live in. */
export const CANVAS_HOST_KEY: InjectionKey<(host: HTMLElement) => void> = Symbol('canvas-host');

/** Overlay missile button. The latch itself lives in infrastructure; this is only the press. */
export const MISSILE_PRESS_KEY: InjectionKey<() => void> = Symbol('missile-press');

/** Overlay special button (The Speech). */
export const SPECIAL_PRESS_KEY: InjectionKey<() => void> = Symbol('special-press');
