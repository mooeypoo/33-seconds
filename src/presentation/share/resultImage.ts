import viperNeutral from '../../../assets/ships/viper_neutral.png';
import type { RunResult } from '../../application/runResult';
import { summarizeRun } from './runSummary';

/**
 * Draws a finished run as a PNG for sharing (PRD 17): plain Canvas 2D with the fonts and the Viper
 * the page already has, so nothing is fetched and the CSP stays as it is. 1200×630 is the size link
 * previews and chat apps show without cropping.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN = 56;
const SPRITE_SIZE = 96;

interface Palette {
  readonly deep: string;
  readonly space: string;
  readonly accent: string;
  readonly strong: string;
  readonly muted: string;
  readonly line: string;
}

function palette(won: boolean): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback;
  return {
    deep: token('--color-deep', '#05070a'),
    space: token('--color-space', '#0b0e14'),
    accent: won ? token('--color-dradis', '#4fe19a') : token('--color-loss', '#d67f7f'),
    strong: token('--color-text-strong', '#f3efe3'),
    muted: token('--color-text-muted', '#9fb8ab'),
    line: won ? token('--color-dradis-line', '#2c4a3a') : token('--color-loss-border', '#5a3a2c'),
  };
}

/** The readable-font setting swaps the display face everywhere, the image included (PRD 15). */
function faces(): { display: string; body: string } {
  const body = "'Atkinson Hyperlegible', system-ui, sans-serif";
  const readable = document.documentElement.classList.contains('readable-font');
  return { display: readable ? body : "'VT323', ui-monospace, monospace", body };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      resolve(null);
    };
    image.src = src;
  });
}

/** Lines of `text` that fit `width`, at most `maxLines`, the last one cut with an ellipsis. */
function wrap(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= width || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1] ?? ''}…`;
  return kept;
}

export async function renderResultImage(result: RunResult, gameVersion: string, site: string): Promise<Blob> {
  const summary = summarizeRun(result);
  const colors = palette(result.outcome === 'won');
  const font = faces();
  // A canvas draws with a fallback if a face has not loaded yet; ask for both first.
  await Promise.allSettled([document.fonts.load(`64px ${font.display}`), document.fonts.load(`28px ${font.body}`)]);
  const sprite = await loadImage(viperNeutral);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2D canvas');
  context.imageSmoothingEnabled = false;
  context.textBaseline = 'alphabetic';

  context.fillStyle = colors.deep;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = colors.space;
  context.fillRect(24, 24, WIDTH - 48, HEIGHT - 48);
  context.strokeStyle = colors.line;
  context.lineWidth = 2;
  context.strokeRect(25, 25, WIDTH - 50, HEIGHT - 50);

  // Masthead: the Viper and the name, then what happened and on which tier.
  if (sprite) context.drawImage(sprite, MARGIN, MARGIN - 8, SPRITE_SIZE, SPRITE_SIZE);
  context.fillStyle = colors.accent;
  context.font = `64px ${font.display}`;
  context.fillText('33 SECONDS', MARGIN + SPRITE_SIZE + 20, MARGIN + 56);
  context.textAlign = 'right';
  context.font = `30px ${font.display}`;
  context.fillText(`${summary.kicker} · ${summary.tier}`.toUpperCase(), WIDTH - MARGIN, MARGIN + 52);
  context.textAlign = 'left';

  // Left column: the headline, the line under it, and the score.
  const leftWidth = 640;
  context.fillStyle = colors.strong;
  context.font = `64px ${font.display}`;
  let y = 210;
  for (const line of wrap(context, summary.headline, leftWidth, 2)) {
    context.fillText(line, MARGIN, y);
    y += 60;
  }
  context.fillStyle = colors.muted;
  context.font = `26px ${font.body}`;
  y += 4;
  for (const line of wrap(context, summary.text, leftWidth, 3)) {
    context.fillText(line, MARGIN, y);
    y += 34;
  }
  context.fillStyle = colors.accent;
  context.font = `28px ${font.display}`;
  context.fillText('SCORE', MARGIN, 470);
  context.font = `120px ${font.display}`;
  context.fillText(summary.score, MARGIN, 560);

  // Right column: the numbers.
  const statsLeft = 760;
  context.font = `26px ${font.body}`;
  y = 200;
  for (const stat of summary.stats) {
    context.fillStyle = colors.muted;
    context.textAlign = 'left';
    context.fillText(stat.label, statsLeft, y);
    context.fillStyle = colors.strong;
    context.textAlign = 'right';
    context.fillText(stat.value, WIDTH - MARGIN, y);
    y += 44;
  }
  context.textAlign = 'left';
  if (summary.mostKilled) {
    context.fillStyle = colors.muted;
    context.font = `italic 22px ${font.body}`;
    for (const line of wrap(context, summary.mostKilled, WIDTH - MARGIN - statsLeft, 2)) {
      context.fillText(line, statsLeft, y + 8);
      y += 30;
    }
  }

  context.fillStyle = colors.muted;
  context.font = `20px ${font.body}`;
  context.textAlign = 'right';
  context.fillText(`Unofficial fan game · v${gameVersion} · ${site}`, WIDTH - MARGIN, HEIGHT - MARGIN + 8);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('the canvas gave no PNG'));
    }, 'image/png');
  });
}
