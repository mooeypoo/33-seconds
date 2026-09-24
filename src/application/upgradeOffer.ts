import { cardDefinition, isCardId, maxStacksFor, type CardRarity } from '../domain/progression/catalog';
import type { GameView } from '../domain/views';

/** One card on the Recovering table, with what the pick sheet shows beside the flair (PRD 10.1). */
export type { CardRarity };

export interface OfferCard {
  readonly id: string;
  readonly rarity: CardRarity;
  /** Stacks already owned, 0 for a new card. */
  readonly owned: number;
  readonly maxStacks: number;
}

/** The dealt hand, in order. Empty outside Recovering. */
export function offerCards(view: GameView): OfferCard[] {
  const ids = view.upgradeOffer?.cardIds ?? [];
  return ids.filter(isCardId).map((id) => {
    const rarity = cardDefinition(id).rarity;
    const owned = view.loadout.find((card) => card.id === id)?.stacks ?? 0;
    return { id, rarity, owned, maxStacks: maxStacksFor(rarity) };
  });
}
