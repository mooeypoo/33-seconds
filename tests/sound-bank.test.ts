import { describe, expect, it } from 'vitest';
import { SOUND_VOLUME_CAP, ZZFX_PARAMETER_COUNT, parseSoundBank } from '../src/application/audio/soundBank';

/**
 * The loader behind `check:content` for sounds. A bad entry must be named, never played: the game
 * skips it, and the content check fails on the problem list.
 */
function parse(...entries: unknown[]): ReturnType<typeof parseSoundBank> {
  return parseSoundBank({ sounds: entries });
}

describe('the sound bank', () => {
  it('reads a numeric array, with null as an empty slot', () => {
    const { bank, problems } = parse({ id: 'jump', zzfx: [0.5, null, 150] });
    expect(problems).toEqual([]);
    expect(bank.get('jump')).toEqual([0.5, undefined, 150]);
  });

  it('reads the Sound Designer text as pasted: holes, leading dots, the zzfx wrapper', () => {
    const { bank, problems } = parse({ id: 'jump', zzfx: 'zzfx(...[,,925,.04,-.3,1e-2]); // Jump 3' });
    expect(problems).toEqual([]);
    expect(bank.get('jump')).toEqual([undefined, undefined, 925, 0.04, -0.3, 0.01]);
  });

  it.each([
    ['an unknown id', { id: 'laser_pew', zzfx: [0.5] }, /not a known sound id/],
    ['no id', { zzfx: [0.5] }, /entry 0 is not a known sound id/],
    ['no array', { id: 'jump' }, /needs a zzfx array/],
    ['an empty array', { id: 'jump', zzfx: [] }, /empty/],
    ['too many values', { id: 'jump', zzfx: Array(ZZFX_PARAMETER_COUNT + 1).fill(0) }, /at most 21/],
    ['a string value', { id: 'jump', zzfx: [0.5, '0.05'] }, /position 1/],
    ['a value that is not finite', { id: 'jump', zzfx: [0.5, 0, Number.NaN] }, /position 2/],
    ['text that is not a number', { id: 'jump', zzfx: '[,,loud]' }, /position 2/],
    ['text with no array', { id: 'jump', zzfx: 'zzfx()' }, /without a \[/],
    ['a volume over the cap', { id: 'jump', zzfx: [SOUND_VOLUME_CAP + 0.1] }, /volume/],
    ['a negative volume', { id: 'jump', zzfx: [-1] }, /volume/],
  ])('rejects %s and names it', (_what, entry, message) => {
    const { bank, problems } = parse(entry);
    expect(bank.size).toBe(0);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(message);
  });

  it('keeps the first of a doubled id and names the second', () => {
    const { bank, problems } = parse({ id: 'jump', zzfx: [0.1] }, { id: 'jump', zzfx: [0.9] });
    expect(bank.get('jump')).toEqual([0.1]);
    expect(problems).toEqual(['"jump" appears twice']);
  });

  it('keeps the good entries when one is bad', () => {
    const { bank, problems } = parse({ id: 'jump', zzfx: [2] }, { id: 'speech', zzfx: [0.3] });
    expect([...bank.keys()]).toEqual(['speech']);
    expect(problems).toHaveLength(1);
  });

  it('refuses a file without a sounds list', () => {
    expect(parseSoundBank([{ id: 'jump', zzfx: [0.3] }]).problems).toEqual(['sounds.json needs a "sounds" array']);
    expect(parseSoundBank(null).bank.size).toBe(0);
  });
});
