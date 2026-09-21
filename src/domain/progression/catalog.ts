/**
 * Starter upgrade set (PRD 10.2). Effects are modifiers, not flags. Text lives in JSON (D8).
 *
 * ASSUMPTION: these nine are the ones whose systems already exist. Hangar Door Slam, Raptor,
 * and Imaginary Six wait with the features they need.
 */
export type CardId =
  | 'accidentally-wide'
  | 'anyone-could-be-a-cylon'
  | 'bootleg-hooch'
  | 'continuity-of-government'
  | 'flak-enthusiast'
  | 'overcompensating-cannon'
  | 'personal-vendetta'
  | 'spoilers'
  | 'your-call-is-important-to-us';

export type CardRarity = 'common' | 'uncommon' | 'questionable';

export interface CardDefinition {
  readonly id: CardId;
  readonly rarity: CardRarity;
}

export const STARTER_CARDS: readonly CardDefinition[] = [
  { id: 'accidentally-wide', rarity: 'common' },
  { id: 'your-call-is-important-to-us', rarity: 'common' },
  { id: 'continuity-of-government', rarity: 'common' },
  { id: 'flak-enthusiast', rarity: 'common' },
  { id: 'spoilers', rarity: 'uncommon' },
  { id: 'anyone-could-be-a-cylon', rarity: 'uncommon' },
  { id: 'bootleg-hooch', rarity: 'uncommon' },
  { id: 'overcompensating-cannon', rarity: 'uncommon' },
  { id: 'personal-vendetta', rarity: 'uncommon' },
];

export function maxStacksFor(rarity: CardRarity): number {
  if (rarity === 'common') return 3;
  if (rarity === 'uncommon') return 2;
  return 1;
}

export function cardDefinition(id: CardId): CardDefinition {
  const found = STARTER_CARDS.find((card) => card.id === id);
  if (!found) throw new Error(`unknown card ${id}`);
  return found;
}

export function isCardId(id: string): id is CardId {
  return STARTER_CARDS.some((card) => card.id === id);
}

/** Hurtbox and drawn hull grow by this per *Accidentally Wide* stack. */
export const WIDE_SCALE_PER_STACK = 1.25;

/** *Bootleg Hooch*: fire rate multiplier and speed multiplier per stack. */
export const HOOCH_FIRE_RATE_PER_STACK = 1.35;
export const HOOCH_SPEED_PER_STACK = 0.8;

/** *Your Call Is Important to Us*: extra download seconds per stack. */
export const CALL_WAITING_SECONDS_PER_STACK = 2;

/**
 * *Overcompensating Cannon* per stack: slower, bigger, and this many extra bodies the round
 * can pass through. ASSUMPTION: 0.7 speed, 1.5 radius, pierce 2 until play says it is too much.
 */
export const CANNON_SPEED_PER_STACK = 0.7;
export const CANNON_RADIUS_PER_STACK = 1.5;
export const CANNON_PIERCE_PER_STACK = 2;

/** *Personal Vendetta*: missile speed multiplier per stack. */
export const VENDETTA_MISSILE_SPEED_PER_STACK = 0.8;

/** *Anyone Could Be a Cylon*: cover after a save. One save per stack per cycle. */
export const CYLON_SAVE_INVULN_SECONDS = 1.5;

/** *Continuity of Government*: fleet cycle-damage cap multiplier per stack. */
export const CONTINUITY_CAP_PER_STACK = 0.9;

/** *Spoilers*: extra download seconds per shot on a ghost, per stack (PRD 10.2). */
export const SPOILERS_DELAY_SECONDS_PER_STACK = 3;

/**
 * *Flak Enthusiast*: first stack is the PRD 7.1 40% intercept. Extra stacks add 15%, capped so the
 * fleet can still be hurt. ASSUMPTION: without the card every stray still hits, so the pool stays
 * readable. Strafes are not flak.
 */
export const FLAK_INTERCEPT_FIRST_STACK = 0.4;
export const FLAK_INTERCEPT_EXTRA_STACK = 0.15;
export const FLAK_INTERCEPT_MAX = 0.85;
