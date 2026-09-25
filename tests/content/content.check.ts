import { describe, expect, it } from 'vitest';
import scenesRaw from '../../src/content/scenes/recovering.json';
import soundsRaw from '../../src/content/sounds.json';
import flairRaw from '../../src/content/upgrades.flair.json';
import fleetRaw from '../../src/content/fleet.json';
import tiersRaw from '../../src/balance/tiers.json';
import scoringRaw from '../../src/balance/scoring.json';
import endingsRaw from '../../src/content/endings.json';
import trainingRaw from '../../src/content/training.json';
import trainingPresetRaw from '../../src/balance/training.json';
import { parseTrainingPreset } from '../../src/balance/training';
import {
  isPlainText,
  LESSON_BEAT_MAX_CHARACTERS,
  LESSON_FOCUS,
  LESSON_HEADING_MAX_CHARACTERS,
  LESSON_MAX_BEATS,
  LESSON_RECAP_MAX_CHARACTERS,
  LESSON_TRIGGERS,
  parseTrainingScript,
} from '../../src/application/training/trainingScript';
import { parseScoreWeights } from '../../src/balance/scoring';
import {
  ENDING_HEADLINE_MAX_CHARACTERS,
  ENDING_ID_PATTERN,
  ENDING_PLACEHOLDERS,
  ENDING_TEXT_MAX_CHARACTERS,
  REACTION_MAX_CHARACTERS,
} from '../../src/application/endings';
import { parseTierProfile, TierProfileError } from '../../src/balance/profileSchema';
import { isTierId } from '../../src/domain/balance/profile';
import { BANTER_TEXT_MAX_CHARACTERS, isSpeaker, parseBanterSource } from '../../src/application/banter/lines';
import { parseScenes } from '../../src/application/banter/recoveringScene';
import { STARTER_CARDS, isCardId } from '../../src/domain/progression/catalog';
import { parseSoundBank } from '../../src/application/audio/soundBank';
import { SOUND_IDS } from '../../src/application/audio/soundIds';

/**
 * `npm run check:content` (ADR-0001 D8, CONTENT-SCHEMA). The game's loaders drop a bad line or
 * scene quietly, which is right for a player and wrong for a writer: the joke just never plays.
 * This check names every problem instead. It is a content gate, not a behavior test, so it has
 * its own command and does not run with `npm test`.
 */

const banterFiles = import.meta.glob<unknown>('../../src/content/banter/*.json', { eager: true, import: 'default' });

/** The placeholders `Banter` fills (CONTENT-SCHEMA 2). */
const PLACEHOLDERS = new Set(['seconds', 'count', 'total', 'percent']);

const MARKUP = /[<>]/;
const EMOJI = /\p{Extended_Pictographic}/u;

interface RawLine {
  readonly file: string;
  readonly id: string;
  readonly text: unknown;
  readonly upgrade: unknown;
}

function fileName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** Every line a writer wrote, in either shape the loader accepts, before any validation. */
function rawLines(file: string, raw: unknown): RawLine[] {
  const entries: { line: unknown; poolWhen: unknown }[] = [];
  if (Array.isArray(raw)) {
    for (const line of raw) entries.push({ line, poolWhen: undefined });
  } else {
    const pools = record(raw).pools;
    if (Array.isArray(pools)) {
      for (const pool of pools) {
        const lines = record(pool).lines;
        if (Array.isArray(lines)) for (const line of lines) entries.push({ line, poolWhen: record(pool).when });
      }
    }
  }
  return entries.map(({ line, poolWhen }) => {
    const fields = record(line);
    const upgrade = record(fields.when).upgrade ?? record(poolWhen).upgrade;
    return {
      file,
      id: typeof fields.id === 'string' ? fields.id : '(no id)',
      text: fields.text,
      upgrade,
    };
  });
}

/** Problems with one piece of player-facing text. Empty when it is fine. */
function textProblems(where: string, text: unknown, allowPlaceholders: boolean): string[] {
  if (typeof text !== 'string' || text.length === 0) return [`${where}: text is missing`];
  const problems: string[] = [];
  if (text.length > BANTER_TEXT_MAX_CHARACTERS) {
    problems.push(`${where}: ${String(text.length)} characters, the limit is ${String(BANTER_TEXT_MAX_CHARACTERS)}`);
  }
  if (MARKUP.test(text)) problems.push(`${where}: contains < or >, text must be plain`);
  if (EMOJI.test(text)) problems.push(`${where}: contains an emoji`);
  for (const match of text.matchAll(/\{([^}]*)\}/g)) {
    const name = match[1] ?? '';
    if (!allowPlaceholders) problems.push(`${where}: placeholder {${name}} is not filled here`);
    else if (!PLACEHOLDERS.has(name)) problems.push(`${where}: unknown placeholder {${name}}`);
  }
  return problems;
}

describe('banter lines', () => {
  const lines = Object.entries(banterFiles).flatMap(([path, raw]) => rawLines(fileName(path), raw));

  it('names a known speaker in every file, matching the file name', () => {
    const problems = Object.entries(banterFiles).flatMap(([path, raw]) => {
      const file = fileName(path);
      if (Array.isArray(raw)) return [`${file}: one object per line; use the pool shape (CONTENT-SCHEMA 2)`];
      const speaker = record(raw).speaker;
      if (!isSpeaker(speaker)) return [`${file}: unknown speaker ${JSON.stringify(speaker)}`];
      return file === `${speaker}.json` ? [] : [`${file}: speaker is ${speaker}, but the file is not ${speaker}.json`];
    });
    expect(problems).toEqual([]);
  });

  it('loads every line a writer wrote; nothing is dropped quietly', () => {
    const problems = Object.entries(banterFiles).flatMap(([path, raw]) => {
      const file = fileName(path);
      const loaded = new Set(parseBanterSource(raw).map((line) => line.id));
      return rawLines(file, raw)
        .filter((line) => !loaded.has(line.id))
        .map((line) => `${file} ${line.id}: the game drops this line (check trigger, priority, speaker, and length)`);
    });
    expect(problems).toEqual([]);
  });

  it('keeps every id unique across files', () => {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    for (const line of lines) {
      const first = seen.get(line.id);
      if (first) problems.push(`${line.id}: in ${first} and ${line.file}`);
      else seen.set(line.id, line.file);
    }
    expect(problems).toEqual([]);
  });

  it('keeps text plain, short, and to known placeholders', () => {
    expect(lines.flatMap((line) => textProblems(`${line.file} ${line.id}`, line.text, true))).toEqual([]);
  });

  it('only conditions on cards that exist', () => {
    const problems = lines
      .filter((line) => line.upgrade !== undefined && !(typeof line.upgrade === 'string' && isCardId(line.upgrade)))
      .map((line) => `${line.file} ${line.id}: unknown upgrade ${JSON.stringify(line.upgrade)}`);
    expect(problems).toEqual([]);
  });
});

describe('Recovering scenes', () => {
  const raw = Array.isArray(scenesRaw) ? (scenesRaw as unknown[]) : [];

  it('loads every scene a writer wrote', () => {
    const loaded = new Set(parseScenes(raw).map((scene) => scene.id));
    const problems = raw
      .map((scene) => record(scene).id)
      .filter((id) => typeof id !== 'string' || !loaded.has(id))
      .map((id) => `scene ${String(id)}: the game drops this scene (2 to 4 beats, known speakers, a damage band)`);
    expect(problems).toEqual([]);
  });

  it('keeps ids unique and beats plain and short', () => {
    const seen = new Set<string>();
    const problems: string[] = [];
    for (const scene of raw) {
      const fields = record(scene);
      const id = typeof fields.id === 'string' ? fields.id : '(no id)';
      if (seen.has(id)) problems.push(`scene ${id}: duplicate id`);
      seen.add(id);
      const beats = Array.isArray(fields.beats) ? fields.beats : [];
      beats.forEach((beat, index) => {
        problems.push(...textProblems(`scene ${id} beat ${String(index + 1)}`, record(beat).text, false));
      });
    }
    expect(problems).toEqual([]);
  });
});

describe('upgrade flair', () => {
  const raw = Array.isArray(flairRaw) ? (flairRaw as unknown[]) : [];

  it('has flair for every card, and a card for every flair', () => {
    const flairIds = raw.map((entry) => record(entry).id);
    const problems = [
      ...STARTER_CARDS.filter((card) => !flairIds.includes(card.id)).map((card) => `${card.id}: no flair`),
      ...flairIds
        .filter((id) => !(typeof id === 'string' && isCardId(id)))
        .map((id) => `flair ${JSON.stringify(id)}: no such card`),
    ];
    expect(problems).toEqual([]);
  });

  it('gives every card a title, a joke, a plain effect, and both advisors', () => {
    const problems = raw.flatMap((entry) => {
      const fields = record(entry);
      const id = String(fields.id);
      const advice = record(fields.advice);
      const missing = [
        ['title', fields.title],
        ['joke', fields.joke],
        ['plain', fields.plain],
        ['advice.baltar', advice.baltar],
        ['advice.roslin', advice.roslin],
      ]
        .filter(([, value]) => typeof value !== 'string' || value.length === 0)
        .map(([name]) => `flair ${id}: ${String(name)} is missing`);
      const markup = [fields.title, fields.joke, fields.plain, advice.baltar, advice.roslin]
        .filter((value): value is string => typeof value === 'string' && (MARKUP.test(value) || EMOJI.test(value)))
        .map(() => `flair ${id}: text must be plain, with no markup or emoji`);
      return [...missing, ...markup];
    });
    expect(problems).toEqual([]);
  });
});

describe('fleet names', () => {
  const MAX_NAME_CHARACTERS = 28;
  const SLOTS = 9;
  const names: unknown[] = Array.isArray(fleetRaw.civilianNames) ? fleetRaw.civilianNames : [];

  it('has at least one name per civilian slot, each unique', () => {
    const trimmed = names.filter((name): name is string => typeof name === 'string').map((name) => name.trim());
    const problems: string[] = [];
    if (trimmed.length < SLOTS) problems.push(`only ${String(trimmed.length)} names; a run needs ${String(SLOTS)}`);
    const seen = new Set<string>();
    for (const name of trimmed) {
      if (seen.has(name)) problems.push(`"${name}" is listed twice`);
      seen.add(name);
    }
    expect(problems).toEqual([]);
  });

  it('keeps each name short enough for one console row, and plain', () => {
    const problems = names.flatMap((name) => {
      if (typeof name !== 'string' || name.trim().length === 0) return [`${JSON.stringify(name)}: not a name`];
      const found: string[] = [];
      if (name.trim().length > MAX_NAME_CHARACTERS) {
        found.push(`"${name}": ${String(name.trim().length)} characters, the limit is ${String(MAX_NAME_CHARACTERS)}`);
      }
      if (MARKUP.test(name) || EMOJI.test(name)) found.push(`"${name}": text must be plain`);
      return found;
    });
    expect(problems).toEqual([]);
  });
});

describe('tier profiles', () => {
  it('has only known tiers, each with valid numbers', () => {
    const problems: string[] = [];
    for (const [id, raw] of Object.entries(tiersRaw)) {
      if (!isTierId(id)) {
        problems.push(`tiers.json: unknown tier "${id}"`);
        continue;
      }
      try {
        parseTierProfile(id, raw);
      } catch (error) {
        if (error instanceof TierProfileError) problems.push(...error.problems);
        else throw error;
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('score weights', () => {
  it('has every weight, each a number in range, and nothing unknown', () => {
    expect(() => parseScoreWeights(scoringRaw)).not.toThrow();
  });
});

describe('end-screen lines', () => {
  const known = new Set<string>(ENDING_PLACEHOLDERS);

  function textProblems(where: string, text: unknown, max: number): string[] {
    if (typeof text !== 'string' || text.length === 0) return [`${where} must be text`];
    const problems: string[] = [];
    if (text.length > max) problems.push(`${where} is ${String(text.length)} characters; the limit is ${String(max)}`);
    if (MARKUP.test(text) || EMOJI.test(text)) problems.push(`${where} has markup or emoji`);
    for (const [, name] of text.matchAll(/\{(\w+)\}/g)) {
      if (!known.has(name ?? '')) problems.push(`${where} uses {${String(name)}}, which nothing fills`);
    }
    return problems;
  }

  it('has lines for both outcomes, with unique stable ids, short plain text, and known placeholders', () => {
    const problems: string[] = [];
    const ids = new Set<string>();
    for (const outcome of ['won', 'lost'] as const) {
      const lines: unknown[] = Array.isArray(endingsRaw[outcome]) ? endingsRaw[outcome] : [];
      if (lines.length === 0) problems.push(`endings.json: no ${outcome} lines`);
      lines.forEach((raw, index) => {
        const line = record(raw);
        const where = `endings.json ${outcome}[${String(index)}]`;
        if (typeof line.id !== 'string' || !ENDING_ID_PATTERN.test(line.id)) problems.push(`${where}: id must match ${String(ENDING_ID_PATTERN)}`);
        else if (ids.has(line.id)) problems.push(`${where}: id "${line.id}" is used twice`);
        else ids.add(line.id);
        problems.push(...textProblems(`${where}.headline`, line.headline, ENDING_HEADLINE_MAX_CHARACTERS));
        problems.push(...textProblems(`${where}.text`, line.text, ENDING_TEXT_MAX_CHARACTERS));
      });
    }
    problems.push(...textProblems('endings.json mostKilled.text', endingsRaw.mostKilled.text, ENDING_TEXT_MAX_CHARACTERS));
    const reactions: unknown[] = Array.isArray(endingsRaw.mostKilled.reactions) ? endingsRaw.mostKilled.reactions : [];
    if (reactions.length === 0) problems.push('endings.json mostKilled.reactions: needs at least one');
    reactions.forEach((reaction, index) => {
      problems.push(...textProblems(`endings.json mostKilled.reactions[${String(index)}]`, reaction, REACTION_MAX_CHARACTERS));
    });
    expect(problems).toEqual([]);
  });
});

describe('Training Run', () => {
  const script = parseTrainingScript(trainingRaw);

  /** Why a lesson would be dropped, in a writer's words. Empty when it loads. */
  function lessonProblems(raw: unknown, index: number): string[] {
    const lesson = record(raw);
    const where = `training.json lessons[${String(index)}] ${typeof lesson.id === 'string' ? lesson.id : '(no id)'}`;
    const problems: string[] = [];
    if (!(LESSON_TRIGGERS as readonly unknown[]).includes(lesson.trigger)) {
      problems.push(`${where}: trigger must be one of ${LESSON_TRIGGERS.join(', ')}`);
    }
    if (lesson.focus !== undefined && !(LESSON_FOCUS as readonly unknown[]).includes(lesson.focus)) {
      problems.push(`${where}: focus must be one of ${LESSON_FOCUS.join(', ')}`);
    }
    if (!isPlainText(lesson.heading, LESSON_HEADING_MAX_CHARACTERS, false)) {
      problems.push(`${where}: heading must be plain text up to ${String(LESSON_HEADING_MAX_CHARACTERS)} characters`);
    }
    if (lesson.recap !== undefined && !isPlainText(lesson.recap, LESSON_RECAP_MAX_CHARACTERS, false)) {
      problems.push(`${where}: recap must be plain text up to ${String(LESSON_RECAP_MAX_CHARACTERS)} characters`);
    }
    const beats: unknown[] = Array.isArray(lesson.beats) ? lesson.beats : [];
    if (beats.length === 0 || beats.length > LESSON_MAX_BEATS) problems.push(`${where}: needs 1 to ${String(LESSON_MAX_BEATS)} beats`);
    beats.forEach((rawBeat, beatIndex) => {
      const beat = record(rawBeat);
      if (!isSpeaker(beat.speaker)) problems.push(`${where} beat ${String(beatIndex)}: unknown speaker ${JSON.stringify(beat.speaker)}`);
      if (!isPlainText(beat.text, LESSON_BEAT_MAX_CHARACTERS, true)) {
        problems.push(`${where} beat ${String(beatIndex)}: plain text up to ${String(LESSON_BEAT_MAX_CHARACTERS)} characters, placeholders {before}, {after}, {cap} only`);
      }
    });
    return problems;
  }

  it('loads every lesson a writer wrote, each id once', () => {
    const rawLessons: unknown[] = Array.isArray(trainingRaw.lessons) ? trainingRaw.lessons : [];
    const loaded = new Set(script.lessons.map((lesson) => lesson.id));
    // Every lesson is held to the writing limits, including one the game still plays: a long line
    // plays, but it is named here.
    const problems = rawLessons.flatMap((raw, index) => {
      const reasons = lessonProblems(raw, index);
      const id = record(raw).id;
      if (typeof id === 'string' && loaded.has(id)) return reasons;
      return reasons.length > 0 ? reasons : [`training.json lessons[${String(index)}]: dropped (check the id, the when, and repeats)`];
    });
    expect(problems).toEqual([]);
    expect(script.lessons.length).toBe(rawLessons.length);
  });

  it('opens with at least one lesson, and has a debrief with a grade', () => {
    expect(script.lessons.some((lesson) => lesson.trigger === 'TrainingStarted')).toBe(true);
    expect(script.debrief.beats.length).toBeGreaterThan(0);
    expect(script.debrief.recapIntro.length).toBeGreaterThan(0);
    expect(script.debrief.grades.length).toBe(trainingRaw.debrief.grades.length);
    expect(script.debrief.grades.length).toBeGreaterThan(0);
  });

  it('has a valid preset in balance/training.json', () => {
    expect(() => parseTrainingPreset(trainingPresetRaw)).not.toThrow();
  });
});

describe('sounds', () => {
  const { bank, problems } = parseSoundBank(soundsRaw);

  it('has no entry the game would skip: known ids, numeric arrays of valid length, volume under the cap', () => {
    expect(problems).toEqual([]);
  });

  it('has a sound for every id, so nothing the game asks for is silent by accident', () => {
    expect(SOUND_IDS.filter((id) => !bank.has(id))).toEqual([]);
  });
});
