/**
 * ISO 8601 weeks (PRD 11.1): weeks start on Monday, and week 1 is the week with the year's first
 * Thursday, so 1 January can belong to the previous year's week 52 or 53.
 *
 * Read in UTC, so every player's week turns over at the same moment (Monday 00:00 UTC) and a link
 * made just before the turn names the same week for its sender and for whoever opens it.
 */
// ASSUMPTION: UTC, not the player's local midnight. A shared weekly is about everyone flying the same
// rules; local weeks would split the community for up to a day. Cheap to change: only this file.
export interface IsoWeek {
  readonly year: number;
  /** 1 to 52, or 53 in a long year. */
  readonly week: number;
}

const DAY_MS = 86_400_000;

export function isoWeekOf(date: Date): IsoWeek {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Move to the Thursday of this week: its year is the week's year.
  const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const year = day.getUTCFullYear();
  const week = Math.floor((day.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return { year, week };
}

/** 52 or 53. 28 December is always in the year's last week. */
export function isoWeeksIn(year: number): number {
  return isoWeekOf(new Date(Date.UTC(year, 11, 28))).week;
}

/** `2026-W40`: the year, then the week with two digits. */
export function formatIsoWeek({ year, week }: IsoWeek): string {
  return `${String(year)}-W${String(week).padStart(2, '0')}`;
}

const ISO_WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;

/** Null for anything that is not a real week, such as week 53 of a 52-week year. */
export function parseIsoWeek(text: string): IsoWeek | null {
  const match = ISO_WEEK_PATTERN.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > isoWeeksIn(year)) return null;
  return { year, week };
}
