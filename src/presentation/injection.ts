import type { InjectionKey } from 'vue';
import type { GameSession } from '../application/GameSession';

/**
 * Presentation receives the session and the canvas hook from the composition root (`main.ts`).
 * It never reaches into the infrastructure layer itself, which the dependency check enforces.
 */
export const SESSION_KEY: InjectionKey<GameSession> = Symbol('session');

/** Called once with the element the canvas should live in. */
export const CANVAS_HOST_KEY: InjectionKey<(host: HTMLElement) => void> = Symbol('canvas-host');
