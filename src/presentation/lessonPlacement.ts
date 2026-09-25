import type { FocusBox } from '../application/training/lessonFocus';
import { WORLD_HEIGHT_UNITS } from '../domain/shared/world';

/** Where a lesson card sits in the lane. */
export type CardSlot = 'top' | 'middle' | 'bottom';

/**
 * A stretch of the lane, top to bottom in CSS pixels from the lane's top edge, that the card should
 * not cover. Priority 0 matters most (the lesson's subject); higher numbers give way first.
 */
export interface LaneSpan {
  readonly top: number;
  readonly bottom: number;
  readonly priority: number;
}

/** Tried in this order when several slots are equally clear: the bottom was the card's old home. */
const SLOT_ORDER: readonly CardSlot[] = ['bottom', 'top', 'middle'];

/**
 * Picks the slot where the card covers the least of what the lesson is about (PRD 5.5). It keeps
 * the most important things clear first: a slot that covers the subject loses to one that only
 * covers the fleet row. When the card fills the lane, it sits at the top and the lane scrolls.
 *
 * @param padding the space the lane keeps around the card, in CSS pixels
 */
export function chooseCardSlot(laneHeight: number, cardHeight: number, padding: number, spans: readonly LaneSpan[]): CardSlot {
  if (cardHeight + padding * 2 >= laneHeight) return 'top';
  const middleTop = (laneHeight - cardHeight) / 2;
  const reach: Record<CardSlot, { top: number; bottom: number }> = {
    top: { top: padding, bottom: padding + cardHeight },
    middle: { top: middleTop, bottom: middleTop + cardHeight },
    bottom: { top: laneHeight - padding - cardHeight, bottom: laneHeight - padding },
  };
  const priorities = [...new Set(spans.map((span) => span.priority))].sort((left, right) => left - right);
  /** How many spans of each priority, most important first, the card would cover in this slot. */
  const covered = (slot: CardSlot): number[] =>
    priorities.map(
      (priority) =>
        spans.filter((span) => span.priority === priority && span.top < reach[slot].bottom && span.bottom > reach[slot].top)
          .length,
    );
  let best: CardSlot = SLOT_ORDER[0] ?? 'bottom';
  for (const slot of SLOT_ORDER) {
    if (isFewer(covered(slot), covered(best))) best = slot;
  }
  return best;
}

/** Compares cover counts most important first. */
function isFewer(candidate: readonly number[], best: readonly number[]): boolean {
  for (let index = 0; index < candidate.length; index++) {
    const left = candidate[index] ?? 0;
    const right = best[index] ?? 0;
    if (left !== right) return left < right;
  }
  return false;
}

/**
 * Turns world boxes into lane spans, given where the canvas and the lane are on the page. The canvas
 * is fitted to the world's height, so one world unit is the canvas height over the world's.
 */
export function spansFromWorld(boxes: readonly FocusBox[], canvas: DOMRect, lane: DOMRect): LaneSpan[] {
  const unit = canvas.height / WORLD_HEIGHT_UNITS;
  return boxes.map((box) => ({
    top: canvas.top - lane.top + (box.y - box.halfHeight) * unit,
    bottom: canvas.top - lane.top + (box.y + box.halfHeight) * unit,
    priority: box.priority,
  }));
}

/** A page element the card should not cover, such as a touch button the lesson is about. */
export function spanFromElement(element: Element, lane: DOMRect, priority: number): LaneSpan {
  const rect = element.getBoundingClientRect();
  return { top: rect.top - lane.top, bottom: rect.bottom - lane.top, priority };
}
