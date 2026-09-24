import { FLEET_CYCLE_DAMAGE_CAP, FLEET_REPAIR_OF_MISSING } from '../fleet/integrity';
import { ATTACK_TOKENS, DIRECTOR_CAP, STRAFE_TOKENS } from '../swarm/resurrection';
import type { CycleProfile } from './profile';

/**
 * The profile a game gets when none is passed: Civilian Run numbers from the domain's constants.
 * Tests rely on it, so a test that does not care about tiers keeps the numbers it was written for.
 */
export const DEFAULT_CYCLE_PROFILE: CycleProfile = {
  id: 'civilian-ship',
  fleetCycleDamageCap: FLEET_CYCLE_DAMAGE_CAP,
  fleetRepairOfMissing: FLEET_REPAIR_OF_MISSING,
  directorCap: [DIRECTOR_CAP],
  swarmFloor: [0],
  downloadJitterSeconds: 0,
  sineShare: [0],
  attackTokens: [ATTACK_TOKENS],
  strafeTokens: [STRAFE_TOKENS],
};
