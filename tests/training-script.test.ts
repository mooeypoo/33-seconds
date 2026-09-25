import { describe, expect, it } from 'vitest';
import { parseTrainingScript } from '../src/application/training/trainingScript';

/**
 * The loader is what the game plays (PRD 5.5, CONTENT-SCHEMA 6c). A writer's long line is a style
 * problem for `check:content` to name; it must never make a lesson vanish from the game.
 */
function scriptWith(text: string): unknown {
  return {
    lessons: [{ id: 'sim-long', trigger: 'FleetHit', heading: 'Long', beats: [{ speaker: 'tyrol', text }] }],
  };
}

describe('the training script loader', () => {
  it('keeps a lesson whose line runs past the writing limit', () => {
    const script = parseTrainingScript(scriptWith('A long line. '.repeat(20).trim()));

    expect(script.lessons.map((lesson) => lesson.id)).toEqual(['sim-long']);
  });

  it('still drops a lesson that could not be shown right: markup, or a placeholder nothing fills', () => {
    expect(parseTrainingScript(scriptWith('<b>bold</b>')).lessons).toEqual([]);
    expect(parseTrainingScript(scriptWith('Lost {score} points.')).lessons).toEqual([]);
  });
});
