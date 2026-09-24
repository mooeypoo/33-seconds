import tiers from './tiers.json';
import { isTierId, type CycleProfile, type TierId } from '../domain/balance/profile';
import { parseTierProfile } from './profileSchema';

/**
 * The only place play-tier numbers live (ADR-0001 D9, ADR-0002 Phase 3): `tiers.json`, one object
 * per difficulty, checked on load. Retuning is an edit to that file.
 */
function loadTiers(raw: Record<string, unknown>): Record<TierId, CycleProfile> {
  const loaded: Partial<Record<TierId, CycleProfile>> = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (!isTierId(id)) throw new Error(`tiers.json: unknown tier "${id}"`);
    loaded[id] = parseTierProfile(id, entry);
  }
  const civilian = loaded['civilian-ship'];
  const pilot = loaded['viper-pilot'];
  if (!civilian || !pilot) throw new Error('tiers.json must define civilian-ship and viper-pilot');
  return { 'civilian-ship': civilian, 'viper-pilot': pilot };
}

export const TIER_PROFILES: Record<TierId, CycleProfile> = loadTiers(tiers);

/** Play default (PRD 11). */
export const DEFAULT_PLAY_TIER: TierId = 'viper-pilot';

export function profileFor(id: TierId): CycleProfile {
  return TIER_PROFILES[id];
}
