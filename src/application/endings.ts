import endingsRaw from '../content/endings.json';
import type { RandomStream } from '../domain/shared/random';

/**
 * The end screen's headline lines (PRD 5.4), from `src/content/endings.json`. A malformed line is
 * dropped here and named by `check:content`. Text renders as text, never as HTML.
 */
export type RunOutcome = 'won' | 'lost' | 'held';

export interface EndingLine {
  readonly id: string;
  readonly headline: string;
  readonly text: string;
}

export const ENDING_HEADLINE_MAX_CHARACTERS = 40;
export const ENDING_TEXT_MAX_CHARACTERS = 140;
/** One reaction after the most-killed stat. Short, because it shares a line with the stat. */
export const REACTION_MAX_CHARACTERS = 80;
export const ENDING_ID_PATTERN = /^[a-z0-9-]{1,40}$/;

/** Placeholders `fillEnding` knows. Anything else in braces is left as written, and flagged by the content check. */
export const ENDING_PLACEHOLDERS = ['score', 'cycles', 'jumps', 'identity', 'count'] as const;

const FALLBACK: Record<RunOutcome, EndingLine> = {
  won: { id: 'won-fallback', headline: 'The fleet made it', text: 'The resurrection ship is gone.' },
  lost: { id: 'lost-fallback', headline: 'The fleet did not make it', text: 'Fleet Integrity reached zero.' },
  held: { id: 'held-fallback', headline: 'The fleet held', text: 'For as long as it could.' },
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function parseEndingLine(raw: unknown): EndingLine | null {
  const { id, headline, text } = record(raw);
  if (typeof id !== 'string' || !ENDING_ID_PATTERN.test(id)) return null;
  if (typeof headline !== 'string' || headline.length === 0 || headline.length > ENDING_HEADLINE_MAX_CHARACTERS) return null;
  if (typeof text !== 'string' || text.length === 0 || text.length > ENDING_TEXT_MAX_CHARACTERS) return null;
  return { id, headline, text };
}

function parseLines(raw: unknown): EndingLine[] {
  return Array.isArray(raw) ? raw.map(parseEndingLine).filter((line): line is EndingLine => line !== null) : [];
}

const ENDINGS: Record<RunOutcome, readonly EndingLine[]> = {
  won: parseLines(endingsRaw.won),
  lost: parseLines(endingsRaw.lost),
  held: parseLines(endingsRaw.held),
};

const MOST_KILLED_TEXT: string =
  typeof endingsRaw.mostKilled.text === 'string' ? endingsRaw.mostKilled.text : 'Most-killed Raider: #{identity}, {count} times.';

/** The jokes after the stat. A bad entry is dropped here and named by `check:content`. */
const REACTIONS: readonly string[] = (Array.isArray(endingsRaw.mostKilled.reactions) ? endingsRaw.mostKilled.reactions : []).filter(
  (reaction: unknown): reaction is string =>
    typeof reaction === 'string' && reaction.length > 0 && reaction.length <= REACTION_MAX_CHARACTERS,
);

export function endingLines(outcome: RunOutcome): readonly EndingLine[] {
  return ENDINGS[outcome];
}

/** A fresh line for a run that just ended. */
export function pickEnding(outcome: RunOutcome, random: RandomStream): EndingLine {
  const lines = ENDINGS[outcome];
  return lines[random.index(lines.length)] ?? FALLBACK[outcome];
}

/**
 * The line a result names. A shared link can outlive its line (the content pass renames or cuts
 * it), so an unknown id falls back to the outcome's first line rather than breaking the page.
 */
export function endingFor(outcome: RunOutcome, id: string): EndingLine {
  const lines = ENDINGS[outcome];
  return lines.find((line) => line.id === id) ?? lines[0] ?? FALLBACK[outcome];
}

/** Fills `{score}`-style placeholders. Numbers only, so nothing a link carries can become text here. */
export function fillEnding(text: string, values: Partial<Record<(typeof ENDING_PLACEHOLDERS)[number], number>>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key as keyof typeof values];
    return value === undefined ? match : value.toLocaleString('en-US');
  });
}

export function reactionCount(): number {
  return REACTIONS.length;
}

/** A reaction for a run that just ended, as its position in the list. */
export function pickReaction(random: RandomStream): number {
  return random.index(Math.max(1, REACTIONS.length));
}

/**
 * The stat and its reaction. A shared link names the reaction by position, and the list can
 * shrink after a link was made, so a position past the end shows the first reaction.
 */
export function mostKilledLine(identityId: number, kills: number, reaction: number): string {
  const stat = fillEnding(MOST_KILLED_TEXT, { identity: identityId, count: kills });
  const joke = REACTIONS[reaction] ?? REACTIONS[0];
  return joke ? `${stat} ${fillEnding(joke, { identity: identityId, count: kills })}` : stat;
}
