"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, emptyWeek } from "@/lib/store";
import { WEEK_METRICS, type WeekLog, type WeekMetricKey } from "@/lib/types";
import {
  allWeeks, addDays, currentWeekStart, isoWeekNumber, isoWeekYear,
  weekFullLabel, weekRangeLabel, weekIsFuture, LAST_WEEK, FIRST_WEEK,
} from "@/lib/dates";
import { money, num, pct, rate } from "@/lib/format";
import { Button, Card, Stepper, Textarea, Modal } from "@/components/ui";

export default function WeeklyPage() {
  const { weekLogs, saveWeek, profile } = useStore();
  const [week, setWeek] = useState<string>(currentWeekStart());
  const [pickerOpen, setPickerOpen] = useState(false);

  const currency = profile?.currency ?? "USD";
  const saved = weekLogs[week] ?? emptyWeek(week);

  /* Local draft so typing is instant; flushed to Supabase on a debounce. */
  const [draft, setDraft] = useState<WeekLog>(saved);
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Switching weeks discards nothing — we flush first, then reload the draft.
  useEffect(() => {
    setDraft(weekLogs[week] ?? emptyWeek(week));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  // Keep the draft in sync when the server row comes back with a real id.
  useEffect(() => {
    if (!dirty) setDraft(weekLogs[week] ?? emptyWeek(week));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekLogs, week]);

  function update(patch: Partial<WeekLog>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    const forWeek = week;
    timer.current = setTimeout(() => {
      setDraft((d) => {
        const { id, user_id, created_at, updated_at, week_start, ...fields } = d;
        void id; void user_id; void created_at; void updated_at; void week_start;
        saveWeek(forWeek, fields).then(() => setDirty(false));
        return d;
      });
    }, 700);
  }

  // Flush immediately if the tab is closed or hidden mid-edit.
  useEffect(() => {
    const flush = () => {
      if (!dirty || !timer.current) return;
      clearTimeout(timer.current);
      const { id, user_id, created_at, updated_at, week_start, ...fields } = draft;
      void id; void user_id; void created_at; void updated_at; void week_start;
      saveWeek(week, fields);
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [dirty, draft, week, saveWeek]);

  const stats = useMemo(() => ({
    connect: rate(draft.connects, draft.dials),
    book: rate(draft.meetings_booked, draft.connects),
    show: rate(draft.meetings_held, draft.meetings_booked),
    close: rate(draft.closes, draft.meetings_held),
  }), [draft]);

  const isFuture = weekIsFuture(week);
  const isNow = week === currentWeekStart();

  return (
    <div className="space-y-7">
      {/* ------------------------------------------------------------ header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Week Log</h1>
          <p className="text-ink-400 text-lg mt-2">
            Punch in the week&apos;s numbers. Saves itself as you type.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-base font-semibold transition-opacity ${
            dirty ? "text-amber-300 opacity-100" : "text-emerald-300 opacity-80"}`}>
            {dirty ? "Saving…" : "All saved ✓"}
          </span>
          {!isNow && (
            <Button size="md" onClick={() => setWeek(currentWeekStart())}>Jump to now</Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ week chooser */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Button
            size="lg" aria-label="Previous week"
            disabled={week <= FIRST_WEEK}
            onClick={() => setWeek(addDays(week, -7))}
          >
            ←
          </Button>

          <button
            onClick={() => setPickerOpen(true)}
            className="focus-ring grow min-w-0 rounded-xl px-4 py-3 text-center
                       hover:bg-ink-800 transition-colors"
          >
            <div className="text-sm font-bold uppercase tracking-wider text-ink-400">
              Week {isoWeekNumber(week)} · {isoWeekYear(week)}
              {isNow && <span className="ml-2 text-brand-bright">• current</span>}
              {isFuture && <span className="ml-2 text-amber-300">• upcoming</span>}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 truncate">
              {weekRangeLabel(week)}
            </div>
            <div className="text-sm text-ink-500 mt-1">Tap to pick any week →</div>
          </button>

          <Button
            size="lg" aria-label="Next week"
            disabled={week >= LAST_WEEK}
            onClick={() => setWeek(addDays(week, 7))}
          >
            →
          </Button>
        </div>
      </Card>

      {isFuture && (
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 px-5 py-4 text-amber-200 text-lg">
          This week hasn&apos;t happened yet, but you can still pre-plan targets here.
        </div>
      )}

      {/* ----------------------------------------------------------- inputs */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {WEEK_METRICS.map((m) => (
          <Card key={m.key} className="p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: m.color }} />
              <span className="text-base font-bold uppercase tracking-wider text-ink-300">
                {m.label}
              </span>
            </div>
            <p className="text-sm text-ink-500 mb-4">{m.sub}</p>
            <Stepper
              value={Number(draft[m.key as WeekMetricKey]) || 0}
              onChange={(v) => update({ [m.key]: v } as Partial<WeekLog>)}
              step={m.key === "revenue" ? 500 : m.key === "dials" ? 10 : 1}
              accent={m.color}
              money={m.money}
            />
          </Card>
        ))}
      </div>

      {/* -------------------------------------------------- live conversion */}
      <Card className="p-6 sm:p-7">
        <h2 className="text-2xl font-bold tracking-tight mb-1">This week&apos;s conversion</h2>
        <p className="text-ink-400 mb-6">Updates live as you type.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Conv label="Connect rate" hint="Connects ÷ Dials"    value={pct(stats.connect, 0)} />
          <Conv label="Book rate"    hint="Booked ÷ Connects"   value={pct(stats.book, 0)} />
          <Conv label="Show rate"    hint="Held ÷ Booked"       value={pct(stats.show, 0)} />
          <Conv label="Close rate"   hint="Closes ÷ Held"       value={pct(stats.close, 0)} />
        </div>
      </Card>

      {/* ------------------------------------------------------------ notes */}
      <Card className="p-6 sm:p-7">
        <h2 className="text-2xl font-bold tracking-tight mb-1">Notes for the week</h2>
        <p className="text-ink-400 mb-5">What worked, what didn&apos;t, who to chase.</p>
        <Textarea
          rows={5}
          value={draft.notes ?? ""}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Best pitch angle this week was… / Follow up with…"
        />
      </Card>

      <WeekPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={week}
        onPick={(w) => { setWeek(w); setPickerOpen(false); }}
        logs={weekLogs}
        currency={currency}
      />
    </div>
  );
}

function Conv({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-ink-800/60 px-5 py-4">
      <div className="text-sm font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-3xl font-extrabold tnum text-ink-100 mt-1.5">{value}</div>
      <div className="text-xs text-ink-500 mt-1">{hint}</div>
    </div>
  );
}

/* ------------------------------------------------------------ week picker */

function WeekPicker({
  open, onClose, selected, onPick, logs, currency,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  onPick: (w: string) => void;
  logs: Record<string, WeekLog>;
  currency: string;
}) {
  const [year, setYear] = useState(() => isoWeekYear(selected));
  const now = currentWeekStart();

  const years = useMemo(() => {
    const s = new Set(allWeeks().map(isoWeekYear));
    return [...s].sort();
  }, []);

  const weeks = useMemo(
    () => allWeeks().filter((w) => isoWeekYear(w) === year),
    [year]
  );

  const rowRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) rowRef.current?.scrollIntoView({ block: "center" });
  }, [open, year]);

  return (
    <Modal open={open} onClose={onClose} wide
           title="Pick a week" sub={`Every week from ${FIRST_WEEK.slice(0,4)} through 2028.`}>
      <div className="flex flex-wrap gap-2.5 mb-6 sticky top-0 z-10">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`focus-ring h-12 px-6 rounded-xl text-lg font-bold transition-all
              active:scale-95 border-2
              ${year === y
                ? "bg-brand text-white border-brand-bright"
                : "bg-ink-850 text-ink-300 border-ink-700 hover:border-ink-500"}`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((w) => {
          const l = logs[w];
          const has = l && (l.dials || l.connects || l.meetings_held || l.closes || Number(l.revenue));
          const isSel = w === selected;
          const isNow = w === now;
          return (
            <button
              key={w}
              ref={isSel ? rowRef : undefined}
              onClick={() => onPick(w)}
              className={`focus-ring w-full flex items-center gap-4 rounded-xl px-4 py-3.5
                text-left transition-colors border-2
                ${isSel ? "bg-brand/20 border-brand"
                        : "bg-ink-850/60 border-transparent hover:bg-ink-800 hover:border-ink-600"}`}
            >
              <span className="tnum text-sm font-bold text-ink-500 w-12 shrink-0">
                W{isoWeekNumber(w)}
              </span>
              <span className="text-lg font-semibold grow truncate">
                {weekRangeLabel(w)}
                {isNow && <span className="ml-2 text-sm text-brand-bright font-bold">• now</span>}
              </span>
              {has ? (
                <span className="flex items-center gap-3 shrink-0 tnum text-sm">
                  <span className="text-ink-300">{num(l.dials)} dials</span>
                  <span className="text-ink-300">{num(l.meetings_held)} mtgs</span>
                  <span className="font-bold text-emerald-300">
                    {money(Number(l.revenue), currency, true)}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-ink-600 shrink-0">empty</span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
