import { FLEET_CYCLE_DAMAGE_CAP, FLEET_REPAIR_OF_MISSING } from '../domain/fleet/integrity';
import type { CycleProfile, TierId } from '../domain/balance/profile';

/**
 * The only place play-tier numbers live (ADR-0001 D9). Civilian Run reuses the domain
 * constants so a one-line retune of those constants stays the easier fleet.
 */
export const TIER_PROFILES: Record<TierId, CycleProfile> = {
  'civilian-ship': {
    id: 'civilian-ship',
    fleetCycleDamageCap: FLEET_CYCLE_DAMAGE_CAP,
    fleetRepairOfMissing: FLEET_REPAIR_OF_MISSING,
  },
  'viper-pilot': {
    id: 'viper-pilot',
    // PRD 7.3: cap 45, repair 40%. Ignoring the fleet loses on cycle 5.
    fleetCycleDamageCap: 45,
    fleetRepairOfMissing: 0.4,
  },
};

/** Play default (PRD 11). */
export const DEFAULT_PLAY_TIER: TierId = 'viper-pilot';

export function profileFor(id: TierId): CycleProfile {
  return TIER_PROFILES[id];
}
