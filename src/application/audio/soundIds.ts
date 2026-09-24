/**
 * Every sound the game can ask for (ADR-0002 3.5, PRD 14.1). `src/content/sounds.json` holds one
 * ZzFX array per id; `npm run check:content` fails when an id is missing, unknown, or doubled.
 *
 * Player auto-fire has no id on purpose: it fires several times a second, and anything louder than
 * silence would bury every other cue.
 */
export const SOUND_IDS = [
  'raider_destroyed',
  'heavy_destroyed',
  'ship_destroyed',
  'missile_launch',
  'viper_hit',
  'viper_eject',
  'fleet_hit',
  'raider_returned',
  'ship_arrived',
  'shield_hit',
  'spool_5s',
  'spool_2s',
  'jump',
  'speech',
  'card_select',
  'card_apply',
  'run_won',
  'run_lost',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

export function isSoundId(value: unknown): value is SoundId {
  return typeof value === 'string' && (SOUND_IDS as readonly string[]).includes(value);
}
