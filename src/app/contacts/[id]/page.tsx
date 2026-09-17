"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { colorFor, fullName, initials, money, titleCase } from "@/lib/format";
import { longDate, relativeDue } from "@/lib/dates";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui";
import { ContactModal, TaskModal } from "@/components/RecordModals";
import { DealModal } from "@/components/DealModal";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { contacts, accounts, deals, tasks, stages, profile, toggleTask } = useStore();

  const [edit, setEdit] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [newDeal, setNewDeal] = useState(false);

  const currency = profile?.currency ?? "USD";
  const contact = contacts.find((c) => c.id === id);
  const account = contact?.account_id
    ? accounts.find((a) => a.id === contact.account_id) : undefined;

  const myDeals = useMemo(() => deals.filter((d) => d.contact_id === id), [deals, id]);
  const myTasks = useMemo(
    () => tasks.filter((t) => t.contact_id === id)
               .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tasks, id]);
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  if (!contact) {
    return (
      <Card>
        <EmptyState icon="🔍" title="Contact not found"
          action={<Link href="/contacts"><Button variant="primary" size="lg">Back to contacts</Button></Link>} />
      </Card>
    );
  }

  const name = fullName(contact);

  return (
    <div className="space-y-7">
      <button onClick={() => router.push("/contacts")}
              className="focus-ring rounded-lg text-ink-400 hover:text-ink-100 text-base font-semibold">
        ← All contacts
      </button>

      <Card className="p-7">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar text={initials(contact.first_name, contact.last_name)}
                  color={colorFor(name)} size={76} />
          <div className="min-w-0 grow">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-ink-400 text-lg mt-1.5">
              {contact.title || "No title"}
              {account && (
                <>
                  {" at "}
                  <Link href={`/accounts/${account.id}`}
                        className="focus-ring rounded text-brand-bright hover:underline font-semibold">
                    {account.name}
                  </Link>
                </>
              )}
            </p>
            <div className="mt-4"><Badge color="#9085e9">{titleCase(contact.status)}</Badge></div>
          </div>
          <Button size="lg" onClick={() => setEdit(true)}>Edit</Button>
        </div>

        {/* big, tappable contact actions */}
        <div className="flex flex-wrap gap-3 mt-7 pt-6 border-t border-ink-700">
          {(contact.mobile || contact.phone) && (
            <a href={`tel:${contact.mobile || contact.phone}`}
               className="focus-ring inline-flex items-center gap-2.5 h-14 px-7 rounded-2xl text-lg
                          font-semibold bg-ink-700/70 border border-ink-600 hover:bg-ink-600/70 transition-colors">
              ☎ {contact.mobile || contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`}
               className="focus-ring inline-flex items-center gap-2.5 h-14 px-7 rounded-2xl text-lg
                          font-semibold bg-ink-700/70 border border-ink-600 hover:bg-ink-600/70 transition-colors">
              ✉ {contact.email}
            </a>
          )}
          {contact.linkedin && (
            <a href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
               target="_blank" rel="noreferrer"
               className="focus-ring inline-flex items-center gap-2.5 h-14 px-7 rounded-2xl text-lg
                          font-semibold bg-ink-700/70 border border-ink-600 hover:bg-ink-600/70 transition-colors">
              in LinkedIn ↗
            </a>
          )}
          <Button size="lg" onClick={() => setNewTask(true)}>⏰ Schedule follow-up</Button>
          <Button size="lg" variant="primary" onClick={() => setNewDeal(true)}>→ Create deal</Button>
        </div>

        {contact.notes && (
          <div className="mt-6 pt-6 border-t border-ink-700">
            <div className="text-sm font-bold uppercase tracking-wider text-ink-400 mb-2">Notes</div>
            <p className="text-lg text-ink-200 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight mb-5">Deals</h2>
          {myDeals.length ? (
            <div className="space-y-3">
              {myDeals.map((d) => {
                const s = d.stage_id ? stageById.get(d.stage_id) : undefined;
                return (
                  <Link key={d.id} href="/pipeline"
                        className="card focus-ring flex items-center gap-4 p-5 hover:border-ink-500 transition-colors">
                    <span className="h-10 w-1.5 rounded-full shrink-0"
                          style={{ background: s?.color ?? "#465468" }} />
                    <span className="grow min-w-0">
                      <span className="block text-lg font-bold truncate">{d.name}</span>
                      <span className="block text-base text-ink-400">
                        {s?.name ?? "No stage"}
                        {d.expected_close ? ` · ${longDate(d.expected_close)}` : ""}
                      </span>
                    </span>
                    <span className="tnum text-xl font-extrabold shrink-0">
                      {money(Number(d.value), currency, true)}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="▤" title="No deals yet"
              action={<Button variant="primary" size="lg" onClick={() => setNewDeal(true)}>
                Create one</Button>} />
          )}
        </Card>

        <Card className="p-6 sm:p-7">
          <h2 className="text-2xl font-bold tracking-tight mb-5">Follow-ups</h2>
          {myTasks.length ? (
            <ul className="space-y-3">
              {myTasks.map((t) => {
                const rel = relativeDue(t.due_date);
                return (
                  <li key={t.id} className="card flex items-center gap-4 p-4">
                    <button onClick={() => toggleTask(t.id)}
                      aria-label={t.status === "done" ? "Mark open" : "Mark done"}
                      className={`focus-ring h-9 w-9 shrink-0 rounded-xl border-2 text-lg font-bold
                        transition-colors ${t.status === "done"
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : "border-ink-600 hover:border-emerald-400"}`}>
                      {t.status === "done" ? "✓" : ""}
                    </button>
                    <span className={`grow text-lg font-semibold ${
                      t.status === "done" ? "line-through text-ink-500" : ""}`}>{t.title}</span>
                    <span className={`text-base font-semibold shrink-0 ${
                      rel.tone === "overdue" ? "text-red-300"
                        : rel.tone === "today" ? "text-amber-300" : "text-ink-400"}`}>
                      {rel.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon="✓" title="Nothing scheduled"
              action={<Button variant="primary" size="lg" onClick={() => setNewTask(true)}>
                Schedule a follow-up</Button>} />
          )}
        </Card>
      </div>

      <ContactModal open={edit} onClose={() => setEdit(false)} contact={contact} />
      <TaskModal open={newTask} onClose={() => setNewTask(false)}
                 seed={{ contact_id: contact.id, account_id: contact.account_id,
                         title: `Follow up with ${name}` }} />
      <DealModal open={newDeal} onClose={() => setNewDeal(false)}
                 seed={{ contact_id: contact.id, account_id: contact.account_id,
                         name: account ? `${account.name} new opportunity`
                                       : `${name} new opportunity` }} />
    </div>
  );
}
