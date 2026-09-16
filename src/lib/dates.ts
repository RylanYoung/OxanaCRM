/**
 * All date maths here is done in UTC on plain `YYYY-MM-DD` strings so that a
 * week never shifts under you because of a timezone or daylight-saving change.
 */

const DAY = 86_400_000;

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse `YYYY-MM-DD` to a Date pinned at UTC midnight. */
export function parseISO(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, n: number): string {
  return toISO(new Date(parseISO(s).getTime() + n * DAY));
}

/** The Monday of the week containing `s`. */
export function mondayOf(s: string): string {
  const d = parseISO(s);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return toISO(new Date(d.getTime() - dow * DAY));
}

export function todayISO(): string {
  return toISO(new Date());
}

export function currentWeekStart(): string {
  return mondayOf(todayISO());
}

/* ------------------------------------------------------------------ weeks */

/** First Monday on/after 1 Jan 2025 — the earliest loggable week. */
export const FIRST_WEEK = mondayOf("2025-01-06");
/** Last Monday on/before 31 Dec 2028 — the final loggable week. */
export const LAST_WEEK = mondayOf("2028-12-31");

let _weeks: string[] | null = null;

/** Every loggable week start (Mondays), FIRST_WEEK → LAST_WEEK inclusive. */
export function allWeeks(): string[] {
  if (_weeks) return _weeks;
  const out: string[] = [];
  for (let w = FIRST_WEEK; w <= LAST_WEEK; w = addDays(w, 7)) out.push(w);
  _weeks = out;
  return out;
}

/** ISO-8601 week number (1–53). */
export function isoWeekNumber(weekStart: string): number {
  const d = parseISO(weekStart);
  const thursday = new Date(d.getTime() + 3 * DAY); // Mon-based week → its Thursday
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.floor((thursday.getTime() - jan1.getTime()) / DAY / 7) + 1;
}

/** The ISO year a week belongs to (may differ from the Monday's calendar year). */
export function isoWeekYear(weekStart: string): number {
  return new Date(parseISO(weekStart).getTime() + 3 * DAY).getUTCFullYear();
}

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function shortDate(s: string): string {
  const d = parseISO(s);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function longDate(s: string): string {
  const d = parseISO(s);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** e.g. "Sep 14 – Sep 20" */
export function weekRangeLabel(weekStart: string): string {
  return `${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))}`;
}

/** e.g. "W38 · Sep 14 – Sep 20, 2026" */
export function weekFullLabel(weekStart: string): string {
  return `W${isoWeekNumber(weekStart)} · ${weekRangeLabel(weekStart)}, ${isoWeekYear(weekStart)}`;
}

export function weekIsCurrent(weekStart: string): boolean {
  return weekStart === currentWeekStart();
}

export function weekIsFuture(weekStart: string): boolean {
  return weekStart > currentWeekStart();
}

/* ------------------------------------------------------------- timeframes */

export interface Range {
  start: string;
  end: string;
  label: string;
}

export type TimeframeId =
  | "this_week" | "last_week" | "last_4_weeks" | "this_month" | "last_month"
  | "last_3_months" | "last_6_months" | "last_12_months" | "ytd" | "all";

export const TIMEFRAMES: { id: TimeframeId; label: string; short: string }[] = [
  { id: "this_week",      label: "This Week",     short: "Week" },
  { id: "last_week",      label: "Last Week",     short: "Last Wk" },
  { id: "last_4_weeks",   label: "Last 4 Weeks",  short: "4 Wks" },
  { id: "this_month",     label: "This Month",    short: "Month" },
  { id: "last_month",     label: "Last Month",    short: "Last Mo" },
  { id: "last_3_months",  label: "Last 3 Months", short: "3 Mo" },
  { id: "last_6_months",  label: "Last 6 Months", short: "6 Mo" },
  { id: "last_12_months", label: "Last 12 Months",short: "12 Mo" },
  { id: "ytd",            label: "Year to Date",  short: "YTD" },
  { id: "all",            label: "All Time",      short: "All" },
];

function monthStart(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}
function monthEnd(d: Date): string {
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function resolveTimeframe(id: TimeframeId): Range {
  const today = todayISO();
  const now = parseISO(today);
  const label = TIMEFRAMES.find((t) => t.id === id)?.label ?? "Custom";
  const wk = currentWeekStart();

  switch (id) {
    case "this_week":
      return { start: wk, end: addDays(wk, 6), label };
    case "last_week":
      return { start: addDays(wk, -7), end: addDays(wk, -1), label };
    case "last_4_weeks":
      return { start: addDays(wk, -21), end: addDays(wk, 6), label };
    case "this_month":
      return { start: monthStart(now), end: monthEnd(now), label };
    case "last_month": {
      const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return { start: monthStart(prev), end: monthEnd(prev), label };
    }
    case "last_3_months":
      return { start: monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))), end: today, label };
    case "last_6_months":
      return { start: monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))), end: today, label };
    case "last_12_months":
      return { start: monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))), end: today, label };
    case "ytd":
      return { start: toISO(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), end: today, label };
    case "all":
      return { start: FIRST_WEEK, end: LAST_WEEK, label };
  }
}

/**
 * Week starts whose week *overlaps* the range at all. A week counts if any of
 * its seven days falls inside [start, end].
 */
export function weeksInRange(r: Range): string[] {
  return allWeeks().filter((w) => addDays(w, 6) >= r.start && w <= r.end);
}

/** Human "3 days overdue" / "in 2 weeks" style copy for a due date. */
export function relativeDue(due: string): { text: string; tone: "overdue" | "today" | "soon" | "later" } {
  const diff = Math.round((parseISO(due).getTime() - parseISO(todayISO()).getTime()) / DAY);
  if (diff < 0) return { text: diff === -1 ? "1 day overdue" : `${-diff} days overdue`, tone: "overdue" };
  if (diff === 0) return { text: "Today", tone: "today" };
  if (diff === 1) return { text: "Tomorrow", tone: "soon" };
  if (diff <= 7) return { text: `In ${diff} days`, tone: "soon" };
  return { text: longDate(due), tone: "later" };
}
