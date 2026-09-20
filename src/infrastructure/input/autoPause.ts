import type { PauseReason } from '../../application/GameSession';

/**
 * The game pauses itself when the player's attention leaves (PRD 13.3, ADR-0001 D7): a hidden tab,
 * a blurred window, or a rotated phone. A pointer cancelled by the system is wired up by the stick
 * adapter, which is the only place that knows about it.
 */
export function attachAutoPause(pause: (reason: PauseReason) => void): () => void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') pause('tab-hidden');
  };
  const onBlur = (): void => {
    pause('window-blurred');
  };
  const onOrientationChange = (): void => {
    pause('orientation-changed');
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onBlur);
  window.addEventListener('orientationchange', onOrientationChange);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('orientationchange', onOrientationChange);
  };
}
