import type { RunResult } from '../../application/runResult';
import { encodeSharedRun } from '../../application/shareCode';
import { renderResultImage } from './resultImage';
import { summarizeRun } from './runSummary';

/**
 * The two share buttons (PRD 17). Each tries the best thing the browser offers and falls back, and
 * each says what happened so the screen can tell the player: a copy that silently fails reads as a
 * broken button. Nothing leaves the device unless the player sends it themselves.
 */
export type ShareOutcome = 'shared' | 'copied' | 'saved' | 'cancelled' | 'failed';

/** Phones get the system share sheet. A desktop's sheet is often a surprise, so it copies instead. */
const prefersShareSheet = (): boolean => window.matchMedia('(pointer: coarse)').matches;

export function shareUrl(result: RunResult, gameVersion: string): string {
  return `${location.origin}${location.pathname}#${encodeSharedRun({ result, gameVersion })}`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function shareLink(result: RunResult, gameVersion: string): Promise<ShareOutcome> {
  const url = shareUrl(result, gameVersion);
  const summary = summarizeRun(result);
  if (prefersShareSheet() && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: '33 Seconds', text: `${summary.headline} ${summary.score} points.`, url });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
      // Fall through to the clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

function download(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '33-seconds-result.png';
  document.body.append(link);
  link.click();
  link.remove();
  // Not gameplay, so a real timer is fine: some browsers read the URL just after the click.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}

export async function shareImage(result: RunResult, gameVersion: string): Promise<ShareOutcome> {
  const site = location.host || '33 Seconds';
  // Safari needs the clipboard write to start inside the click, so it gets the PNG as a promise.
  const png = renderResultImage(result, gameVersion, site);
  if (typeof ClipboardItem === 'function' && typeof navigator.clipboard.write === 'function') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      return 'copied';
    } catch {
      // Firefox without image clipboard, or permission refused: try the next thing.
    }
  }
  let blob: Blob;
  try {
    blob = await png;
  } catch {
    return 'failed';
  }
  const file = new File([blob], '33-seconds-result.png', { type: 'image/png' });
  if (prefersShareSheet() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '33 Seconds' });
      return 'shared';
    } catch (error) {
      if (isAbort(error)) return 'cancelled';
    }
  }
  download(blob);
  return 'saved';
}
