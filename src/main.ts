import { createApp } from 'vue';
import { SOUND_BANK } from './application/audio/soundBank';
import { GameSession } from './application/GameSession';
import { playfieldForWindow } from './application/playfield';
import { PlayerSettings, effectiveReducedEffects } from './application/playerSettings';
import { ZzfxAudio } from './infrastructure/audio/ZzfxAudio';
import { attachAutoPause } from './infrastructure/input/autoPause';
import { CombinedInput } from './infrastructure/input/CombinedInput';
import { KeyboardInput } from './infrastructure/input/KeyboardInput';
import { PointerStickInput } from './infrastructure/input/PointerStickInput';
import { ButtonLatchInput } from './infrastructure/input/ButtonLatchInput';
import { bootPhaser } from './infrastructure/phaser/PhaserGame';
import { cryptoSeed } from './infrastructure/random/cryptoSeed';
import { createStoragePort } from './infrastructure/storage/LocalStorageAdapter';
import App from './presentation/App.vue';
import {
  CANVAS_HOST_KEY,
  MISSILE_PRESS_KEY,
  RESIZE_PLAYFIELD_KEY,
  SPECIAL_PRESS_KEY,
  SESSION_KEY,
} from './presentation/injection';
import { hudStore } from './presentation/stores/hudStore';
import { settingsStore } from './presentation/stores/settingsStore';
import './presentation/styles.css';

/**
 * The composition root: the one place that knows about every layer. It wires adapters to the
 * session, the session to the overlay, and the canvas to Phaser. Nothing else crosses layers.
 */
const root = document.getElementById('game-root');
if (!root) throw new Error('#game-root is missing from index.html');

const playerSettings = new PlayerSettings(createStoragePort());
settingsStore.bind(playerSettings);
const osReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Asked each time an effect plays, so the pause-menu toggle and an OS change apply at once (PRD 15).
const reducedEffects = (): boolean =>
  effectiveReducedEffects(osReducedMotion.matches, playerSettings.snapshot.reducedEffects);

const stick = new PointerStickInput(root);
const buttons = new ButtonLatchInput();
const keyboard = new KeyboardInput({
  onPauseRequested: (): void => {
    // Esc and P toggle: pause a run, or start the countdown out of a pause (PRD 13.1, 13.3).
    // On a Training Run lesson they are Got it, including one over the pick sheet (PRD 5.5).
    if (session.status.lesson) session.dismissLesson();
    else if (session.status.phase === 'paused') session.requestResume();
    else session.pause('player');
  },
});

const playfield = playfieldForWindow(window.innerWidth);
// Every Launch draws a fresh seed, so runs differ (ADR-0002 D1).
// No audio context exists until Launch (PRD 14.1): the adapter only makes one when unlocked.
const session = new GameSession(new CombinedInput(stick, keyboard, buttons), {
  playfield,
  seedSource: cryptoSeed,
  audio: new ZzfxAudio(SOUND_BANK),
});
const unsubscribeSound = playerSettings.subscribe((settings) => {
  session.setSoundLevel(settings.muted, settings.volume);
});
let resizePlayfield = (_worldWidth: number): void => {};

keyboard.attach();
stick.attach({
  onPointerCancelled: () => {
    session.pause('pointer-cancelled');
  },
  onStickEngaged: () => {
    hudStore.dismissDragHint();
    settingsStore.markDragHintSeen();
  },
});
const detachAutoPause = attachAutoPause(
  (reason) => {
    session.pause(reason);
  },
  (hidden) => {
    session.setPageHidden(hidden);
  },
);

session.subscribeHud((hud) => {
  hudStore.setHud(hud);
});

const app = createApp(App);
app.provide(SESSION_KEY, session);
app.provide(MISSILE_PRESS_KEY, () => {
  buttons.pressMissile();
});
app.provide(SPECIAL_PRESS_KEY, () => {
  buttons.pressSpecial();
});
app.provide(RESIZE_PLAYFIELD_KEY, (worldWidth: number) => {
  resizePlayfield(worldWidth);
});
app.provide(CANVAS_HOST_KEY, (host: HTMLElement) => {
  const phaser = bootPhaser(
    host,
    session,
    stick,
    (stats) => {
      hudStore.setStats(stats);
    },
    reducedEffects,
    playfield.width,
  );
  resizePlayfield = phaser.resize;
});
app.mount(root);

// Vite's dev server hot-swaps modules; without this the listeners would stack up.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    keyboard.detach();
    stick.detach();
    detachAutoPause();
    unsubscribeSound();
  });
}
