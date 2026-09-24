import { describe, expect, it } from 'vitest';
import { PORTRAIT_NAMES, portraitPose, portraitSrc } from '../src/presentation/portraits';

const CAST = ['Adama', 'Starbuck', 'Gaeta', 'Dualla', 'Tigh', 'Baltar', 'Roslin', 'Tyrol', 'Six'] as const;

describe('portrait frames', () => {
  it('has a closed, open, and blink picture for every speaker', () => {
    expect(PORTRAIT_NAMES).toEqual([...CAST]);
    for (const name of CAST) {
      const closed = portraitSrc(name, 'closed');
      const open = portraitSrc(name, 'open');
      const blink = portraitSrc(name, 'blink');
      expect(closed).toEqual(expect.any(String));
      expect(open).not.toBe(closed);
      expect(blink).not.toBe(closed);
      expect(blink).not.toBe(open);
    }
  });

  it('uses the closed picture for the signature pose', () => {
    for (const name of CAST) {
      expect(portraitSrc(name, 'signature')).toBe(portraitSrc(name, 'closed'));
    }
  });

  it('has no picture for a name outside the cast', () => {
    expect(portraitSrc('Nobody', 'closed')).toBeNull();
  });

  it('holds the mouth shut when effects are reduced', () => {
    expect(portraitPose(0, true)).toBe('closed');
    expect(portraitPose(30 * 7, true)).toBe('closed');
  });

  it('opens, shuts, and blinks slower than three times a second', () => {
    expect(portraitPose(0, false)).toBe('open');
    expect(portraitPose(29, false)).toBe('open');
    expect(portraitPose(30, false)).toBe('closed');
    expect(portraitPose(30 * 7, false)).toBe('blink');
    expect(portraitPose(30 * 8, false)).toBe('open');
  });
});
