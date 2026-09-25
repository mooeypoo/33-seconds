import flair from '../content/upgrades.flair.json';

const titles = new Map((flair as { id: string; title: string }[]).map((card) => [card.id, card.title]));

/** A card's display name, or its id until the flair file names it. */
export function cardTitle(id: string): string {
  return titles.get(id) ?? id;
}
