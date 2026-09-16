"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { fullName, num, titleCase } from "@/lib/format";
import { addDays, longDate, relativeDue, todayISO } from "@/lib/dates";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { TaskModal } from "@/components/RecordModals";

const TYPE_ICON: Record<string, string> = {
  call: "☎", email: "✉", meeting: "▣", follow_up: "⏰", other: "•",
};
const PRIORITY_COLOR: Record<string, string> = {
  high: "#d95926", normal: "#3987e5", low: "#8a8f98",
};

export default function TasksPage() {
  const { tasks, contacts, accounts, deals, toggleTask } = useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  const conName = useMemo(() => new Map(contacts.map((c) => [c.id, fullName(c)])), [contacts]);
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const dealName = useMemo(() => new Map(deals.map((d) => [d.id, d.name])), [deals]);

  const groups = useMemo(() => {
    const today = todayISO();
    const weekEnd = addDays(today, 7);
    const open = tasks.filter((t) => t.status === "open")
                      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return {
      overdue: open.filter((t) => t.due_date < today),
      today: open.filter((t) => t.due_date === today),
      week: open.filter((t) => t.due_date > today && t.due_date <= weekEnd),
      later: open.filter((t) => t.due_date > weekEnd),
      done: tasks.filter((t) => t.status === "done")
                 .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? "")),
    };
  }, [tasks]);

  const openCount = groups.overdue.length + groups.today.length
                  + groups.week.length + groups.later.length;

  function Row({ t }: { t: Task }) {
    const rel = relativeDue(t.due_date);
    const links = [
      t.contact_id && conName.get(t.contact_id),
      t.account_id && accName.get(t.account_id),
      t.deal_id && dealName.get(t.deal_id),
    ].filter(Boolean) as string[];

    return (
      <li className="card flex flex-wrap items-center gap-4 p-5 transition-colors hover:border-ink-500">
        <button
          onClick={() => toggleTask(t.id)}
          aria-label={t.status === "done" ? "Mark as open" : "Mark as done"}
          className={`focus-ring h-11 w-11 shrink-0 rounded-xl border-2 text-xl font-bold
            transition-all active:scale-90 ${t.status === "done"
              ? "bg-emerald-500 border-emerald-400 text-white"
              : "border-ink-600 hover:border-emerald-400 hover:bg-emerald-500/10"}`}
        >
          {t.status === "done" ? "✓" : ""}
        </button>

        <button onClick={() => setEditing(t)}
                className="focus-ring rounded-xl grow min-w-0 text-left">
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0 opacity-70">{TYPE_ICON[t.type] ?? "•"}</span>
            <span className={`text-lg font-bold truncate ${
              t.status === "done" ? "line-through text-ink-500" : ""}`}>
              {t.title}
            </span>
          </div>
          {(links.length > 0 || t.notes) && (
            <div className="text-base text-ink-400 mt-1 truncate pl-8">
              {links.join(" · ")}{links.length && t.notes ? " — " : ""}{t.notes ?? ""}
            </div>
          )}
        </button>

        <div className="flex items-center gap-3 shrink-0">
          {t.priority !== "normal" && (
            <Badge size="sm" color={PRIORITY_COLOR[t.priority]}>{titleCase(t.priority)}</Badge>
          )}
          <span className={`text-base font-semibold tnum ${
            rel.tone === "overdue" ? "text-red-300"
              : rel.tone === "today" ? "text-amber-300"
              : rel.tone === "soon" ? "text-ink-200" : "text-ink-400"}`}>
            {t.status === "done" ? longDate(t.due_date) : rel.text}
            {t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ""}
          </span>
        </div>
      </li>
    );
  }

  function Group({ title, items, tone }: { title: string; items: Task[]; tone?: string }) {
    if (!items.length) return null;
    return (
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className={`text-2xl font-bold tracking-tight ${tone ?? ""}`}>{title}</h2>
          <span className="tnum h-7 min-w-7 px-2.5 rounded-full bg-ink-700 text-ink-200
                           text-sm font-bold flex items-center justify-center">
            {items.length}
          </span>
        </div>
        <ul className="space-y-3">{items.map((t) => <Row key={t.id} t={t} />)}</ul>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Follow-ups</h1>
          <p className="text-ink-400 text-lg mt-2">
            {num(openCount)} open · {num(groups.overdue.length)} overdue · {num(groups.done.length)} done
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
          ＋ New follow-up
        </Button>
      </div>

      {openCount === 0 && !showDone && (
        <Card>
          <EmptyState
            icon={groups.done.length ? "🎉" : "✓"}
            title={groups.done.length ? "All clear" : "No follow-ups yet"}
            sub={groups.done.length
              ? "Every follow-up is done. Nice work."
              : "Schedule a call-back from any contact, account or deal — or add one here."}
            action={
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
                  Add a follow-up
                </Button>
                <Link href="/contacts"><Button size="lg">Browse contacts</Button></Link>
              </div>
            }
          />
        </Card>
      )}

      <Group title="Overdue"      items={groups.overdue} tone="text-red-300" />
      <Group title="Today"        items={groups.today}   tone="text-amber-300" />
      <Group title="Next 7 days"  items={groups.week} />
      <Group title="Later"        items={groups.later} />

      {groups.done.length > 0 && (
        <section>
          <Button size="lg" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "▾ Hide" : "▸ Show"} completed ({groups.done.length})
          </Button>
          {showDone && (
            <ul className="space-y-3 mt-4 opacity-70">
              {groups.done.slice(0, 60).map((t) => <Row key={t.id} t={t} />)}
            </ul>
          )}
        </section>
      )}

      <TaskModal open={creating} onClose={() => setCreating(false)} />
      <TaskModal open={!!editing} onClose={() => setEditing(null)} task={editing} />
    </div>
  );
}
