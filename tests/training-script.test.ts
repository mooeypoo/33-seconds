import { describe, expect, it } from 'vitest';
import { parseTrainingScript } from '../src/application/training/trainingScript';
import { parseTrainingPreset, TrainingPresetError } from '../src/balance/training';

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

describe('the training preset', () => {
  const base = {
    tier: 'civilian-ship',
    resurrectionShipArrivesCycle: 2,
    resurrectionShipVulnerableCycle: 3,
    resurrectionShipHitPoints: 24,
    firstDrill: 'target',
    drills: { target: { cap: 1, attackTokens: 0 }, full: {} },
  };

  it('reads each drill as a swarm override, and an empty one as the tier itself', () => {
    const preset = parseTrainingPreset(base);

    expect(preset.drills.target).toEqual({ cap: 1, attackTokens: 0 });
    expect(preset.drills.full).toEqual({});
  });

  it('names every bad drill at once instead of loading a sim that cannot stage', () => {
    const bad = {
      ...base,
      firstDrill: 'warmup',
      drills: { target: { cap: 0, attackTokens: 1.5, shields: 2 }, 'Bad Id': {} },
    };

    expect(() => parseTrainingPreset(bad)).toThrow(TrainingPresetError);
    try {
      parseTrainingPreset(bad);
    } catch (error) {
      const problems = (error as TrainingPresetError).problems.join('\n');
      expect(problems).toContain('drills.target.cap');
      expect(problems).toContain('drills.target.attackTokens');
      expect(problems).toContain('drills.target.shields');
      expect(problems).toContain('Bad Id');
      expect(problems).toContain('firstDrill');
    }
  });
});
