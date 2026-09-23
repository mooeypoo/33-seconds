/**
 * Which Recovering scene fits the cycle that just ended (PRD 12.3).
 *
 * ASSUMPTION: wrecked is two strafes of fleet damage (16), or a Viper that lost 3 of 5 hull,
 * or an ejection. Clean is a cycle that touched neither. Play can move these.
 */
export const WRECKED_FLEET_DAMAGE = 16;
export const WRECKED_HULL_LOST = 3;

export type DamageBand = 'clean' | 'rough' | 'wrecked';

export function damageBand(fleetDamage: number, hullLost: number, ejected: boolean): DamageBand {
  if (ejected || hullLost >= WRECKED_HULL_LOST || fleetDamage >= WRECKED_FLEET_DAMAGE) return 'wrecked';
  if (fleetDamage <= 0 && hullLost <= 0) return 'clean';
  return 'rough';
}
