import type { CardRarity } from '../application/upgradeOffer';

/** What one card on the Recovering table shows: its flair plus the facts beside it. */
export interface UpgradeCardFace {
  readonly id: string;
  readonly title: string;
  readonly joke: string;
  readonly plain: string;
  readonly advice?: { readonly baltar?: string; readonly roslin?: string };
  readonly rarity: CardRarity;
  readonly owned: number;
  readonly maxStacks: number;
  /** The banner from `assets/cards/<id>.png`, or null until it is drawn. */
  readonly art: string | null;
}
