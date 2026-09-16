import { weeksInRange, type Range } from "./dates";
import { rate } from "./format";
import type { Deal, Stage, WeekLog } from "./types";

export interface ActivityTotals {
  dials: number;
  connects: number;
  conversations: number;
  meetings_booked: number;
  meetings_held: number;
  proposals_submitted: number;
  closes: number;
  revenue: number;
  weeksLogged: number;
  weeksInRange: number;
}

const ZERO: ActivityTotals = {
  dials: 0, connects: 0, conversations: 0, meetings_booked: 0,
  meetings_held: 0, proposals_submitted: 0, closes: 0, revenue: 0,
  weeksLogged: 0, weeksInRange: 0,
};

/** Sum every logged week that overlaps the range. */
export function totalsFor(
  logs: Record<string, WeekLog>,
  range: Range
): ActivityTotals {
  const weeks = weeksInRange(range);
  const t: ActivityTotals = { ...ZERO, weeksInRange: weeks.length };
  for (const w of weeks) {
    const l = logs[w];
    if (!l) continue;
    const touched =
      l.dials || l.connects || l.conversations || l.meetings_booked ||
      l.meetings_held || l.proposals_submitted || l.closes || Number(l.revenue);
    if (touched) t.weeksLogged++;
    t.dials += l.dials;
    t.connects += l.connects;
    t.conversations += l.conversations;
    t.meetings_booked += l.meetings_booked;
    t.meetings_held += l.meetings_held;
    t.proposals_submitted += l.proposals_submitted;
    t.closes += l.closes;
    t.revenue += Number(l.revenue) || 0;
  }
  return t;
}

export interface Derived {
  connectRate: number | null;   // connects / dials
  bookRate: number | null;      // booked  / connects
  showRate: number | null;      // held    / booked
  closeRate: number | null;     // closes  / held
  dialsPerClose: number | null;
  avgDealSize: number | null;
  revenuePerDial: number | null;
  perWeek: (k: keyof ActivityTotals) => number;
}

export function derive(t: ActivityTotals): Derived {
  const wk = t.weeksLogged || 0;
  return {
    connectRate: rate(t.connects, t.dials),
    bookRate: rate(t.meetings_booked, t.connects),
    showRate: rate(t.meetings_held, t.meetings_booked),
    closeRate: rate(t.closes, t.meetings_held),
    dialsPerClose: t.closes ? t.dials / t.closes : null,
    avgDealSize: t.closes ? t.revenue / t.closes : null,
    revenuePerDial: t.dials ? t.revenue / t.dials : null,
    perWeek: (k) => (wk ? (Number(t[k]) || 0) / wk : 0),
  };
}

/* ------------------------------------------------------------------ deals */

export interface PipelineSummary {
  openCount: number;
  openValue: number;
  weightedValue: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  winRate: number | null;
  byStage: { id: string; label: string; color: string; count: number; value: number }[];
}

/** Open pipeline is always "right now"; won/lost are filtered by close date. */
export function pipelineSummary(
  deals: Deal[],
  stages: Stage[],
  range: Range
): PipelineSummary {
  const open = deals.filter((d) => d.status === "open");
  const inRange = (d: Deal) => {
    const day = (d.closed_at ?? "").slice(0, 10);
    return day >= range.start && day <= range.end;
  };
  const won = deals.filter((d) => d.status === "won" && inRange(d));
  const lost = deals.filter((d) => d.status === "lost" && inRange(d));

  const stageProb = new Map(stages.map((s) => [s.id, s.probability]));

  return {
    openCount: open.length,
    openValue: open.reduce((n, d) => n + Number(d.value), 0),
    weightedValue: open.reduce(
      (n, d) => n + Number(d.value) * ((stageProb.get(d.stage_id ?? "") ?? 50) / 100), 0),
    wonCount: won.length,
    wonValue: won.reduce((n, d) => n + Number(d.value), 0),
    lostCount: lost.length,
    winRate: rate(won.length, won.length + lost.length),
    byStage: stages
      .filter((s) => s.kind === "open")
      .map((s) => {
        const ds = open.filter((d) => d.stage_id === s.id);
        return {
          id: s.id, label: s.name, color: s.color,
          count: ds.length,
          value: ds.reduce((n, d) => n + Number(d.value), 0),
        };
      }),
  };
}

/**
 * Goal progress for a range. The weekly goal is scaled by how many weeks the
 * range covers, so "last 3 months" compares against ~13× the weekly target.
 */
export function goalProgress(
  actual: number,
  weeklyGoal: number,
  weeks: number
): { target: number; pct: number } {
  const target = weeklyGoal * Math.max(1, weeks);
  return { target, pct: target > 0 ? (actual / target) * 100 : 0 };
}
