import { createApp } from 'vue';
import { GameSession } from './application/GameSession';
import { attachAutoPause } from './infrastructure/input/autoPause';
import { CombinedInput } from './infrastructure/input/CombinedInput';
import { KeyboardInput } from './infrastructure/input/KeyboardInput';
import { PointerStickInput } from './infrastructure/input/PointerStickInput';
import { ButtonLatchInput } from './infrastructure/input/ButtonLatchInput';
import { bootPhaser } from './infrastructure/phaser/PhaserGame';
import App from './presentation/App.vue';
import { CANVAS_HOST_KEY, MISSILE_PRESS_KEY, SESSION_KEY } from './presentation/injection';
import { hudStore } from './presentation/stores/hudStore';
import './presentation/styles.css';

/**
 * The composition root: the one place that knows about every layer. It wires adapters to the
 * session, the session to the overlay, and the canvas to Phaser. Nothing else crosses layers.
 */
const root = document.getElementById('game-root');
if (!root) throw new Error('#game-root is missing from index.html');

const stick = new PointerStickInput(root);
const buttons = new ButtonLatchInput();
const keyboard = new KeyboardInput({
  onPauseRequested: (): void => {
    // Esc and P toggle: pause a run, or start the countdown out of a pause (PRD 13.1, 13.3).
    if (session.status.phase === 'paused') session.requestResume();
    else session.pause('player');
  },
});

const session = new GameSession(new CombinedInput(stick, keyboard, buttons));

keyboard.attach();
stick.attach({
  onPointerCancelled: () => {
    session.pause('pointer-cancelled');
  },
  onStickEngaged: () => {
    hudStore.dismissDragHint();
  },
});
const detachAutoPause = attachAutoPause((reason) => {
  session.pause(reason);
});

const app = createApp(App);
app.provide(SESSION_KEY, session);
app.provide(MISSILE_PRESS_KEY, () => {
  buttons.pressMissile();
});
app.provide(CANVAS_HOST_KEY, (host: HTMLElement) => {
  bootPhaser(host, session, stick, (stats) => {
    hudStore.setStats(stats);
  });
});
app.mount(root);

// Vite's dev server hot-swaps modules; without this the listeners would stack up.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    keyboard.detach();
    stick.detach();
    detachAutoPause();
  });
}
