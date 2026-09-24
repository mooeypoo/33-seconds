import { VIPER_MAX_SPEED_UNITS_PER_SECOND, VIPER_RADIUS_UNITS } from '../combat/viper';
import { VIPER_FIRE_INTERVAL_SECONDS, VIPER_SHOT_RADIUS_UNITS, VIPER_SHOT_SPEED_UNITS_PER_SECOND } from '../combat/projectile';
import { MISSILE_SPEED_UNITS_PER_SECOND } from '../combat/missile';
import { RESURRECTION_DOWNLOAD_SECONDS } from '../swarm/resurrection';
import { FLEET_CYCLE_DAMAGE_CAP } from '../fleet/integrity';
import type { RandomStream } from '../shared/random';
import {
  CONTINUITY_CAP_PER_STACK,
  CALL_WAITING_SECONDS_PER_STACK,
  FLAK_INTERCEPT_EXTRA_STACK,
  FLAK_INTERCEPT_FIRST_STACK,
  FLAK_INTERCEPT_MAX,
  HANGAR_SLAM_DAMAGE_PER_STACK,
  SPOILERS_DELAY_SECONDS_PER_STACK,
  CANNON_PIERCE_PER_STACK,
  CANNON_RADIUS_PER_STACK,
  CANNON_SPEED_PER_STACK,
  cardDefinition,
  type CardId,
  HOOCH_FIRE_RATE_PER_STACK,
  HOOCH_SPEED_PER_STACK,
  isCardId,
  maxStacksFor,
  STARTER_CARDS,
  VENDETTA_MISSILE_SPEED_PER_STACK,
  WIDE_SCALE_PER_STACK,
} from './catalog';

export interface UpgradeOffer {
  readonly cardIds: readonly CardId[];
  readonly rerollAvailable: boolean;
}

/**
 * Stacks and the numbers they produce. Offers are drawn from the scenario stream so the same seed
 * means the same table (PRD decision 9).
 */
export class Loadout {
  private readonly stacks = new Map<CardId, number>();
  /** Distinct cards in the order they were last taken. The HUD names the last one. */
  private readonly taken: CardId[] = [];
  private offered: CardId[] = [];
  private rerollAvailable = false;
  private cylonSavesLeft = 0;
  private cylonEyeActive = false;

  constructor(
    startingCards: readonly CardId[] = [],
    private readonly baseCycleCap: number = FLEET_CYCLE_DAMAGE_CAP,
  ) {
    for (const id of startingCards) this.addStack(id);
    this.cylonSavesLeft = this.stacksOf('anyone-could-be-a-cylon');
  }

  stacksOf(id: CardId): number {
    return this.stacks.get(id) ?? 0;
  }

  get cards(): readonly { id: CardId; stacks: number; maxStacks: number }[] {
    return STARTER_CARDS.flatMap((card) => {
      const count = this.stacksOf(card.id);
      return count > 0 ? [{ id: card.id, stacks: count, maxStacks: maxStacksFor(card.rarity) }] : [];
    });
  }

  /** Latest card last. A new stack of an old card moves that card to the end. */
  get upgradeOrder(): readonly CardId[] {
    return this.taken;
  }

  get offer(): UpgradeOffer | null {
    if (this.offered.length === 0) return null;
    return { cardIds: this.offered, rerollAvailable: this.rerollAvailable };
  }

  get viperScale(): number {
    return Math.pow(WIDE_SCALE_PER_STACK, this.stacksOf('accidentally-wide'));
  }

  get viperRadius(): number {
    return VIPER_RADIUS_UNITS * this.viperScale;
  }

  get viperMaxSpeed(): number {
    return VIPER_MAX_SPEED_UNITS_PER_SECOND * Math.pow(HOOCH_SPEED_PER_STACK, this.stacksOf('bootleg-hooch'));
  }

  get fireIntervalSeconds(): number {
    return VIPER_FIRE_INTERVAL_SECONDS / Math.pow(HOOCH_FIRE_RATE_PER_STACK, this.stacksOf('bootleg-hooch'));
  }

  get playerShotSpeed(): number {
    return VIPER_SHOT_SPEED_UNITS_PER_SECOND * Math.pow(CANNON_SPEED_PER_STACK, this.stacksOf('overcompensating-cannon'));
  }

  get playerShotRadius(): number {
    return VIPER_SHOT_RADIUS_UNITS * Math.pow(CANNON_RADIUS_PER_STACK, this.stacksOf('overcompensating-cannon'));
  }

  get playerShotScale(): number {
    return Math.pow(CANNON_RADIUS_PER_STACK, this.stacksOf('overcompensating-cannon'));
  }

  get playerPierce(): number {
    return CANNON_PIERCE_PER_STACK * this.stacksOf('overcompensating-cannon');
  }

  get missileSpeed(): number {
    return MISSILE_SPEED_UNITS_PER_SECOND * Math.pow(VENDETTA_MISSILE_SPEED_PER_STACK, this.stacksOf('personal-vendetta'));
  }

  get missilesPreferShip(): boolean {
    return this.stacksOf('personal-vendetta') > 0;
  }

  get downloadSeconds(): number {
    return RESURRECTION_DOWNLOAD_SECONDS + CALL_WAITING_SECONDS_PER_STACK * this.stacksOf('your-call-is-important-to-us');
  }

  get fleetCycleDamageCap(): number {
    return this.baseCycleCap * Math.pow(CONTINUITY_CAP_PER_STACK, this.stacksOf('continuity-of-government'));
  }

  get ghostDelaySeconds(): number {
    return SPOILERS_DELAY_SECONDS_PER_STACK * this.stacksOf('spoilers');
  }

  get ghostsAreShootable(): boolean {
    return this.ghostDelaySeconds > 0;
  }

  get flakInterceptChance(): number {
    const stacks = this.stacksOf('flak-enthusiast');
    if (stacks <= 0) return 0;
    return Math.min(
      FLAK_INTERCEPT_MAX,
      FLAK_INTERCEPT_FIRST_STACK + FLAK_INTERCEPT_EXTRA_STACK * (stacks - 1),
    );
  }

  /** Gun and missile hits on the factory. 1 unless *Hangar Door Slam* and the bays are open. */
  shipDamage(base: number, baysOpen: boolean): number {
    if (!baysOpen) return base;
    return base * (1 + HANGAR_SLAM_DAMAGE_PER_STACK * this.stacksOf('hangar-door-slam'));
  }

  /** One escort per *Raptor Escort* stack. */
  get raptorCount(): number {
    return this.stacksOf('raptor-escort');
  }

  get hasImaginarySix(): boolean {
    return this.stacksOf('imaginary-six') > 0;
  }

  get cylonEye(): boolean {
    return this.cylonEyeActive;
  }

  /** Three unique cards that are not at their stack cap. Reroll is armed. */
  openOffer(rng: RandomStream): void {
    this.offered = drawOffer(rng, this.stacks, []);
    this.rerollAvailable = this.offered.length > 0;
  }

  clearOffer(): void {
    this.offered = [];
    this.rerollAvailable = false;
  }

  /** Fresh three, excluding the current table when enough others remain (PRD 10.1). */
  reroll(rng: RandomStream): boolean {
    if (!this.rerollAvailable) return false;
    this.offered = drawOffer(rng, this.stacks, this.offered);
    this.rerollAvailable = false;
    return true;
  }

  /** Adds one stack if that card is on the table and under its cap. */
  pick(cardId: string): boolean {
    if (!isCardId(cardId) || !this.offered.includes(cardId)) return false;
    if (!this.addStack(cardId)) return false;
    this.clearOffer();
    return true;
  }

  /** One save per stack, refreshed at the start of a cycle. */
  onCycleStart(): void {
    this.cylonSavesLeft = this.stacksOf('anyone-could-be-a-cylon');
  }

  /** The red-eye lasts until the jump (PRD 10.2). */
  onJump(): void {
    this.cylonEyeActive = false;
  }

  tryCylonSave(): boolean {
    if (this.cylonSavesLeft <= 0) return false;
    this.cylonSavesLeft -= 1;
    this.cylonEyeActive = true;
    return true;
  }

  private addStack(id: CardId): boolean {
    const next = this.stacksOf(id) + 1;
    if (next > maxStacksFor(cardDefinition(id).rarity)) return false;
    this.stacks.set(id, next);
    this.remember(id);
    return true;
  }

  private remember(id: CardId): void {
    const index = this.taken.indexOf(id);
    if (index >= 0) this.taken.splice(index, 1);
    this.taken.push(id);
  }
}

function eligibleIds(stacks: ReadonlyMap<CardId, number>): CardId[] {
  return STARTER_CARDS.filter((card) => (stacks.get(card.id) ?? 0) < maxStacksFor(card.rarity)).map((card) => card.id);
}

function drawOffer(rng: RandomStream, stacks: ReadonlyMap<CardId, number>, exclude: readonly CardId[]): CardId[] {
  const eligible = eligibleIds(stacks);
  const preferred = eligible.filter((id) => !exclude.includes(id));
  const pool = preferred.length >= Math.min(3, eligible.length) && preferred.length > 0 ? preferred : eligible;
  return pickUnique(rng, pool, 3);
}

function pickUnique(rng: RandomStream, ids: readonly CardId[], count: number): CardId[] {
  const copy = [...ids];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = rng.index(index + 1);
    const current = copy[index];
    const other = copy[swap];
    if (current === undefined || other === undefined) continue;
    copy[index] = other;
    copy[swap] = current;
  }
  return copy.slice(0, Math.min(count, copy.length));
}
