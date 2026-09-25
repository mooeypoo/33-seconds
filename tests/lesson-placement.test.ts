import { describe, expect, it } from 'vitest';
import { chooseCardSlot, spansFromWorld, type LaneSpan } from '../src/presentation/lessonPlacement';
import { WORLD_HEIGHT_UNITS } from '../src/domain/shared/world';

/**
 * Where a lesson card sits (PRD 5.5): clear of what the lesson is about, the subject first. A lane of
 * 600 px with 12 px of padding; a card of 200 px fits at the top (12 to 212), in the middle (200 to
 * 400), or at the bottom (388 to 588).
 */
const LANE = 600;
const PADDING = 12;
const CARD = 200;

function subject(top: number, bottom: number): LaneSpan {
  return { top, bottom, priority: 0 };
}

function fleetRow(top: number, bottom: number): LaneSpan {
  return { top, bottom, priority: 1 };
}

describe('placing a lesson card', () => {
  it('keeps its old place at the bottom when the lesson points at nothing', () => {
    expect(chooseCardSlot(LANE, CARD, PADDING, [])).toBe('bottom');
  });

  it('moves up, off a Viper low in the lane', () => {
    expect(chooseCardSlot(LANE, CARD, PADDING, [subject(450, 480)])).toBe('top');
  });

  it('stays down, off a resurrection ship high in the lane', () => {
    expect(chooseCardSlot(LANE, CARD, PADDING, [subject(60, 90)])).toBe('bottom');
  });

  it('takes the middle when there is something at each end', () => {
    expect(chooseCardSlot(LANE, CARD, PADDING, [subject(60, 90), fleetRow(560, 580)])).toBe('middle');
  });

  it('keeps the subject clear before the fleet row when it cannot keep both', () => {
    // A tall card (top 12 to 362, middle 125 to 475, bottom 238 to 588): every slot covers something.
    const card = 350;
    expect(chooseCardSlot(LANE, card, PADDING, [subject(20, 40), fleetRow(400, 420)])).toBe('bottom');
    expect(chooseCardSlot(LANE, card, PADDING, [subject(450, 470), fleetRow(100, 120)])).toBe('top');
  });

  it('counts a span that only grazes the card as covered', () => {
    // The bottom card starts at 388, two pixels into this span.
    expect(chooseCardSlot(LANE, CARD, PADDING, [subject(380, 390)])).toBe('top');
  });

  it('starts at the top when the card is as tall as the lane, so it scrolls from its heading', () => {
    expect(chooseCardSlot(LANE, LANE, PADDING, [subject(20, 40)])).toBe('top');
  });

  it('maps world units onto the canvas where it sits in the lane', () => {
    // The canvas starts 10 px below the lane's top and is drawn at 1.5 px per world unit.
    const canvas = { top: 110, height: WORLD_HEIGHT_UNITS * 1.5 } as DOMRect;
    const lane = { top: 100 } as DOMRect;
    const [span] = spansFromWorld([{ x: 0, y: 100, halfWidth: 5, halfHeight: 10, priority: 0 }], canvas, lane);

    expect(span).toEqual({ top: 10 + 90 * 1.5, bottom: 10 + 110 * 1.5, priority: 0 });
  });
});
