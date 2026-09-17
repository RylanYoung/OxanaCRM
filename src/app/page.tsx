"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { WEEK_METRICS, PHASE, type WeekMetricKey } from "@/lib/types";
import {
  TIMEFRAMES, resolveTimeframe, weeksInRange, weekRangeLabel, weekFullLabel,
  todayISO, type TimeframeId,
} from "@/lib/dates";
import { derive, goalProgress, pipelineSummary, totalsFor } from "@/lib/analytics";
import { money, num, pct } from "@/lib/format";
import { Card, Button, SectionTitle, EmptyState } from "@/components/ui";
import { StatTile, GoalBar } from "@/components/StatTile";
import { Funnel, StageBars, TrendChart } from "@/components/charts";

export default function Dashboard() {
  const { weekLogs, deals, stages, tasks, profile, error } = useStore();
  const [tf, setTf] = useState<TimeframeId>("last_12_months");
  const [metric, setMetric] = useState<WeekMetricKey>("dials");

  const range = useMemo(() => resolveTimeframe(tf), [tf]);
  const weeks = useMemo(() => weeksInRange(range), [range]);
  const totals = useMemo(() => totalsFor(weekLogs, range), [weekLogs, range]);
  const d = useMemo(() => derive(totals), [totals]);
  const pipe = useMemo(() => pipelineSummary(deals, stages, range), [deals, stages, range]);

  const currency = profile?.currency ?? "USD";
  const activeMetric = WEEK_METRICS.find((m) => m.key === metric)!;

  const trend = useMemo(
    () => weeks.map((w) => ({
      key: w,
      label: weekRangeLabel(w).split(" – ")[0],
      full: weekFullLabel(w),
      value: Number(weekLogs[w]?.[metric] ?? 0),
    })),
    [weeks, weekLogs, metric]
  );

  const dueToday = useMemo(
    () => tasks.filter((t) => t.status === "open" && t.due_date <= todayISO())
               .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tasks]
  );

  if (error) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl font-bold text-red-300 mb-3">Couldn&apos;t load your data</h2>
        <p className="text-ink-300 text-lg">{error}</p>
      </Card>
    );
  }

  const nothingLogged = totals.weeksLogged === 0;

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-ink-400 text-lg mt-2">
            {range.label} · {totals.weeksLogged} of {weeks.length} weeks logged
          </p>
        </div>
        <Link href="/weekly">
          <Button variant="primary" size="lg">＋ Log this week</Button>
        </Link>
      </div>

      {/* ------------------------------------------------- timeframe filters */}
      <div className="flex flex-wrap gap-2.5">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTf(t.id)}
            className={`focus-ring h-12 px-5 rounded-xl text-base font-semibold transition-all
              active:scale-95 border-2
              ${tf === t.id
                ? "bg-brand text-white border-brand-bright shadow-lg shadow-brand/25"
                : "bg-ink-850/70 text-ink-300 border-ink-700 hover:border-ink-500 hover:text-ink-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {nothingLogged && (
        <Card>
          <EmptyState
            icon="📈"
            title="No activity logged in this window"
            sub="Pick a week and punch in your dials, connects and meetings. The whole dashboard fills itself in from there."
            action={<Link href="/weekly"><Button variant="primary" size="lg">Log a week</Button></Link>}
          />
        </Card>
      )}

      {/* --------------------------------------------------------- headline */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          size="lg" label="Revenue Closed" color={PHASE.won}
          value={money(totals.revenue, currency, true)}
          sub={`${num(totals.closes)} closes · avg ${d.avgDealSize ? money(d.avgDealSize, currency, true) : "n/a"}`}
        />
        <StatTile
          size="lg" label="Open Pipeline" color={PHASE.proposals}
          value={money(pipe.openValue, currency, true)}
          sub={`${pipe.openCount} open · ${money(pipe.weightedValue, currency, true)} weighted`}
          hint="Weighted = each deal's value × its stage probability"
        />
        <StatTile
          size="lg" label="Meetings Held" color={PHASE.meetings}
          value={num(totals.meetings_held)}
          sub={`${num(totals.meetings_booked)} booked · ${pct(d.showRate, 0)} show rate`}
        />
        <StatTile
          size="lg" label="Dials" color={PHASE.prospecting}
          value={num(totals.dials)}
          sub={`${pct(d.connectRate, 0)} connect rate · ${d.perWeek("dials").toFixed(0)}/wk`}
        />
      </div>

      {/* ---------------------------------------------------- all activity */}
      <div>
        <SectionTitle title="Activity" sub={`Everything you logged across ${range.label.toLowerCase()}`} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {WEEK_METRICS.map((m) => (
            <StatTile
              key={m.key}
              label={m.label}
              color={m.color}
              value={m.money ? money(totals[m.key], currency, true) : num(totals[m.key])}
              sub={`${m.money
                ? money(d.perWeek(m.key), currency, true)
                : d.perWeek(m.key).toFixed(1)} / week`}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ trend */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{activeMetric.label} by week</h2>
            <p className="text-ink-400 mt-1">{activeMetric.sub} · one metric at a time, one scale</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEK_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`focus-ring h-11 px-4 rounded-xl text-sm font-bold transition-all
                  active:scale-95 border-2 flex items-center gap-2
                  ${metric === m.key
                    ? "bg-ink-700 text-white border-ink-500"
                    : "bg-transparent text-ink-400 border-ink-700 hover:text-ink-100 hover:border-ink-600"}`}
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <TrendChart
          data={trend} color={activeMetric.color} money={activeMetric.money} height={280}
        />
      </Card>

      {/* --------------------------------------------- funnel + stage split */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Conversion funnel</h2>
          <p className="text-ink-400 mb-6">
            Bar length is the count; the % is conversion from the step above. Colour marks the funnel phase.
          </p>
          <Funnel
            steps={[
              { label: "Dials",     value: totals.dials,               color: PHASE.prospecting },
              { label: "Connects",  value: totals.connects,            color: PHASE.prospecting },
              { label: "Convos",    value: totals.conversations,       color: PHASE.prospecting },
              { label: "Booked",    value: totals.meetings_booked,     color: PHASE.meetings },
              { label: "Held",      value: totals.meetings_held,       color: PHASE.meetings },
              { label: "Submitted", value: totals.proposals_submitted, color: PHASE.proposals },
              { label: "Closes",    value: totals.closes,              color: PHASE.won },
            ]}
          />
          <div className="grid grid-cols-2 gap-4 mt-7 pt-6 border-t border-ink-700">
            <Ratio label="Dials per close" value={d.dialsPerClose ? d.dialsPerClose.toFixed(0) : "n/a"} />
            <Ratio label="Revenue per dial" value={d.revenuePerDial ? money(d.revenuePerDial, currency) : "n/a"} />
            <Ratio label="Book rate" value={pct(d.bookRate, 0)} />
            <Ratio label="Close rate" value={pct(d.closeRate, 0)} />
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Open pipeline by stage</h2>
          <p className="text-ink-400 mb-6">Live right now, not filtered by the date range.</p>
          {pipe.byStage.length ? (
            <StageBars rows={pipe.byStage} currency={currency} />
          ) : (
            <EmptyState icon="▤" title="No open deals yet"
              action={<Link href="/pipeline"><Button variant="primary" size="lg">Open pipeline</Button></Link>} />
          )}
          <div className="grid grid-cols-3 gap-4 mt-7 pt-6 border-t border-ink-700">
            <Ratio label="Won" value={num(pipe.wonCount)} />
            <Ratio label="Lost" value={num(pipe.lostCount)} />
            <Ratio label="Win rate" value={pct(pipe.winRate, 0)} />
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------- goals + follow-ups */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight mb-1">Goals</h2>
          <p className="text-ink-400 mb-6">
            Weekly targets × {weeks.length} {weeks.length === 1 ? "week" : "weeks"} in this range.
            Change them in Settings.
          </p>
          <div className="space-y-6">
            {([
              ["Dials",    totals.dials,         profile?.goal_dials    ?? 250, num],
              ["Connects", totals.connects,      profile?.goal_connects ?? 60,  num],
              ["Meetings", totals.meetings_held, profile?.goal_meetings ?? 10,  num],
              ["Closes",   totals.closes,        profile?.goal_closes   ?? 2,   num],
              ["Revenue",  totals.revenue,       profile?.goal_revenue  ?? 10000,
                (n: number) => money(n, currency, true)],
            ] as const).map(([label, actual, goal, fmt]) => {
              const g = goalProgress(actual, goal, weeks.length);
              return (
                <GoalBar key={label} label={label} actual={actual}
                         target={g.target} pct={g.pct} format={fmt} />
              );
            })}
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Due now</h2>
              <p className="text-ink-400 mt-1">Follow-ups due today or overdue.</p>
            </div>
            <Link href="/tasks"><Button size="md">View all</Button></Link>
          </div>
          {dueToday.length ? (
            <ul className="space-y-3">
              {dueToday.slice(0, 7).map((t) => (
                <li key={t.id}
                    className="flex items-center gap-4 rounded-xl bg-ink-800/60 px-4 py-3.5">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    t.due_date < todayISO() ? "bg-red-500" : "bg-amber-400"}`} />
                  <span className="text-lg font-semibold truncate grow">{t.title}</span>
                  <span className="text-sm text-ink-400 shrink-0 tnum">{t.due_date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🎉" title="Inbox zero" sub="Nothing overdue. Go make some dials." />
          )}
        </Card>
      </div>
    </div>
  );
}

function Ratio({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-2xl font-extrabold tnum text-ink-100 mt-1">{value}</div>
    </div>
  );
}
