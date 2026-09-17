"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { money, num, pct, colorFor } from "@/lib/format";
import { longDate, todayISO } from "@/lib/dates";
import { Button, Card, EmptyState, Badge } from "@/components/ui";
import { DealModal } from "@/components/DealModal";

export default function PipelinePage() {
  const { stages, deals, accounts, contacts, moveDeal, profile } = useStore();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creating, setCreating] = useState<string | null>(null); // stage id
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const currency = profile?.currency ?? "USD";
  const accName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const conName = useMemo(
    () => new Map(contacts.map((c) => [c.id, [c.first_name, c.last_name].filter(Boolean).join(" ")])),
    [contacts]);

  const openValue = deals.filter((d) => d.status === "open")
                         .reduce((n, d) => n + Number(d.value), 0);
  const wonAll = deals.filter((d) => d.status === "won").length;
  const lostAll = deals.filter((d) => d.status === "lost").length;

  function drop(stageId: string) {
    if (dragId) moveDeal(dragId, stageId);
    setDragId(null);
    setOverStage(null);
  }

  if (!stages.length) {
    return (
      <Card>
        <EmptyState
          icon="▤" title="No pipeline stages yet"
          sub="Create your stages first. You can name, colour and order them however you sell."
          action={<Link href="/settings"><Button variant="primary" size="lg">Set up stages</Button></Link>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Pipeline</h1>
          <p className="text-ink-400 text-lg mt-2">
            {num(deals.filter((d) => d.status === "open").length)} open ·{" "}
            {money(openValue, currency, true)} in play · {wonAll} won / {lostAll} lost
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/settings"><Button size="lg">Edit stages</Button></Link>
          <Button variant="primary" size="lg" onClick={() => setCreating(stages[0].id)}>
            ＋ New deal
          </Button>
        </div>
      </div>

      <p className="text-ink-500 text-base">
        Drag a card between columns to move it. Dropping into a Won or Lost column
        closes the deal automatically.
      </p>

      {/* ---------------------------------------------------------- board */}
      <div className="flex gap-5 overflow-x-auto pb-6 -mx-5 px-5 sm:-mx-8 sm:px-8">
        {stages.map((s) => {
          const items = deals.filter((d) => d.stage_id === s.id);
          const value = items.reduce((n, d) => n + Number(d.value), 0);
          const isOver = overStage === s.id;
          return (
            <div
              key={s.id}
              onDragOver={(e) => { e.preventDefault(); setOverStage(s.id); }}
              onDragLeave={() => setOverStage((v) => (v === s.id ? null : v))}
              onDrop={() => drop(s.id)}
              className={`shrink-0 w-[19rem] sm:w-[21rem] rounded-xl2 transition-colors
                ${isOver ? "bg-brand/10 ring-2 ring-brand" : ""}`}
            >
              {/* column header */}
              <div className="flex items-center gap-3 px-1 pb-4">
                <span className="h-3.5 w-3.5 rounded-sm shrink-0" style={{ background: s.color }} />
                <h2 className="text-lg font-extrabold tracking-tight grow truncate">{s.name}</h2>
                <span className="tnum text-sm font-bold text-ink-400 shrink-0">
                  {items.length}
                </span>
              </div>
              <div className="px-1 pb-4 -mt-3">
                <span className="tnum text-base font-bold text-ink-300">
                  {money(value, currency, true)}
                </span>
                {s.kind === "open" && (
                  <span className="text-sm text-ink-500 ml-2">· {s.probability}% likely</span>
                )}
              </div>

              {/* cards */}
              <div className="space-y-3 min-h-24">
                {items.map((d) => {
                  const overdue =
                    d.status === "open" && d.expected_close && d.expected_close < todayISO();
                  return (
                    <button
                      key={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      onClick={() => setEditing(d)}
                      className={`card focus-ring w-full text-left p-4 cursor-grab active:cursor-grabbing
                        transition-all hover:border-ink-500 hover:-translate-y-0.5
                        ${dragId === d.id ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-start gap-3 mb-2.5">
                        <span
                          className="h-9 w-1.5 rounded-full shrink-0 mt-0.5"
                          style={{ background: s.color }}
                        />
                        <span className="text-lg font-bold leading-snug grow">{d.name}</span>
                      </div>

                      <div className="tnum text-2xl font-extrabold text-ink-100 mb-2.5">
                        {money(Number(d.value), currency, true)}
                      </div>

                      {d.account_id && accName.get(d.account_id) && (
                        <div className="flex items-center gap-2 text-base text-ink-300 mb-1.5">
                          <span
                            className="h-5 w-5 rounded-md shrink-0"
                            style={{ background: colorFor(accName.get(d.account_id)!) }}
                          />
                          <span className="truncate">{accName.get(d.account_id)}</span>
                        </div>
                      )}
                      {d.contact_id && conName.get(d.contact_id) && (
                        <div className="text-sm text-ink-400 truncate mb-1.5">
                          ☺ {conName.get(d.contact_id)}
                        </div>
                      )}
                      {d.expected_close && (
                        <div className={`text-sm mt-2 ${overdue ? "text-red-300 font-semibold" : "text-ink-500"}`}>
                          {overdue ? "⚠ overdue · " : "📅 "}{longDate(d.expected_close)}
                        </div>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCreating(s.id)}
                  className="focus-ring w-full rounded-xl border-2 border-dashed border-ink-700
                             py-4 text-base font-semibold text-ink-500
                             hover:border-ink-500 hover:text-ink-200 transition-colors"
                >
                  ＋ Add deal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------------- summary */}
      <Card className="p-6 sm:p-7">
        <h2 className="text-2xl font-bold tracking-tight mb-5">Pipeline health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Mini label="Open value" value={money(openValue, currency, true)} />
          <Mini label="Avg open deal"
                value={money(
                  deals.filter((d) => d.status === "open").length
                    ? openValue / deals.filter((d) => d.status === "open").length : 0,
                  currency, true)} />
          <Mini label="Won all-time" value={num(wonAll)} />
          <Mini label="Win rate"
                value={pct(wonAll + lostAll ? (wonAll / (wonAll + lostAll)) * 100 : null, 0)} />
        </div>
      </Card>

      <DealModal open={!!editing} onClose={() => setEditing(null)} deal={editing} />
      <DealModal
        open={!!creating} onClose={() => setCreating(null)}
        seed={{ stage_id: creating ?? undefined }}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-800/60 px-5 py-4">
      <div className="text-sm font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-2xl font-extrabold tnum text-ink-100 mt-1.5">{value}</div>
    </div>
  );
}
