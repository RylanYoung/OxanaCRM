"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { colorFor, fullName, initials, money, num, titleCase } from "@/lib/format";
import { longDate, relativeDue } from "@/lib/dates";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui";
import { AccountModal, ContactModal, TaskModal } from "@/components/RecordModals";
import { DealModal } from "@/components/DealModal";

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accounts, contacts, deals, tasks, stages, profile, toggleTask } = useStore();

  const [editAcc, setEditAcc] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [newDeal, setNewDeal] = useState(false);
  const [newTask, setNewTask] = useState(false);

  const currency = profile?.currency ?? "USD";
  const account = accounts.find((a) => a.id === id);

  const myContacts = useMemo(
    () => contacts.filter((c) => c.account_id === id), [contacts, id]);
  const myDeals = useMemo(
    () => deals.filter((d) => d.account_id === id), [deals, id]);
  const myTasks = useMemo(
    () => tasks.filter((t) => t.account_id === id || myContacts.some((c) => c.id === t.contact_id))
               .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [tasks, id, myContacts]);

  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);

  if (!account) {
    return (
      <Card>
        <EmptyState icon="🔍" title="Account not found"
          action={<Link href="/accounts"><Button variant="primary" size="lg">Back to accounts</Button></Link>} />
      </Card>
    );
  }

  const openValue = myDeals.filter((d) => d.status === "open")
                           .reduce((n, d) => n + Number(d.value), 0);
  const wonValue = myDeals.filter((d) => d.status === "won")
                          .reduce((n, d) => n + Number(d.value), 0);

  return (
    <div className="space-y-7">
      <button onClick={() => router.push("/accounts")}
              className="focus-ring rounded-lg text-ink-400 hover:text-ink-100 text-base font-semibold">
        ← All accounts
      </button>

      {/* ------------------------------------------------------------ hero */}
      <Card className="p-7">
        <div className="flex flex-wrap items-start gap-6">
          <Avatar text={account.name.slice(0, 2).toUpperCase()}
                  color={colorFor(account.name)} size={76} />
          <div className="min-w-0 grow">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{account.name}</h1>
            <p className="text-ink-400 text-lg mt-1.5">
              {[account.industry, account.employees && `${account.employees} staff`,
                [account.city, account.country].filter(Boolean).join(", ")]
                .filter(Boolean).join(" · ") || "No details yet"}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Badge color="#3987e5">{titleCase(account.status)}</Badge>
              {account.website && (
                <a href={account.website.startsWith("http") ? account.website : `https://${account.website}`}
                   target="_blank" rel="noreferrer"
                   className="focus-ring rounded-lg text-brand-bright hover:underline text-base font-semibold">
                  {account.website} ↗
                </a>
              )}
              {account.phone && (
                <a href={`tel:${account.phone}`}
                   className="focus-ring rounded-lg text-ink-200 hover:text-white text-base font-semibold">
                  ☎ {account.phone}
                </a>
              )}
            </div>
          </div>
          <Button size="lg" onClick={() => setEditAcc(true)}>Edit</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-7 pt-6 border-t border-ink-700">
          <Stat label="Contacts" value={num(myContacts.length)} />
          <Stat label="Open deals" value={num(myDeals.filter((d) => d.status === "open").length)} />
          <Stat label="Open value" value={money(openValue, currency, true)} />
          <Stat label="Won" value={money(wonValue, currency, true)} />
        </div>

        {account.notes && (
          <div className="mt-6 pt-6 border-t border-ink-700">
            <div className="text-sm font-bold uppercase tracking-wider text-ink-400 mb-2">Notes</div>
            <p className="text-lg text-ink-200 whitespace-pre-wrap leading-relaxed">{account.notes}</p>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------------- contacts */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
          <Button variant="primary" size="md" onClick={() => setNewContact(true)}>
            ＋ Add contact
          </Button>
        </div>
        {myContacts.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myContacts.map((c) => (
              <Link key={c.id} href={`/contacts/${c.id}`}
                    className="card focus-ring p-5 flex items-center gap-4 hover:border-ink-500 transition-colors">
                <Avatar text={initials(c.first_name, c.last_name)}
                        color={colorFor(c.first_name + (c.last_name ?? ""))} size={48} />
                <div className="min-w-0 grow">
                  <div className="text-lg font-bold truncate">{fullName(c)}</div>
                  <div className="text-base text-ink-400 truncate">{c.title || "No title"}</div>
                </div>
                <Badge size="sm" color="#9085e9">{titleCase(c.status)}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon="☺" title="No contacts on this account yet"
            action={<Button variant="primary" size="lg" onClick={() => setNewContact(true)}>
              Add the first one</Button>} />
        )}
      </Card>

      {/* ----------------------------------------------------------- deals */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Deals</h2>
          <Button variant="primary" size="md" onClick={() => setNewDeal(true)}>＋ New deal</Button>
        </div>
        {myDeals.length ? (
          <div className="space-y-3">
            {myDeals.map((d) => {
              const s = d.stage_id ? stageById.get(d.stage_id) : undefined;
              return (
                <Link key={d.id} href="/pipeline"
                      className="card focus-ring flex flex-wrap items-center gap-4 p-5 hover:border-ink-500 transition-colors">
                  <span className="h-10 w-1.5 rounded-full shrink-0"
                        style={{ background: s?.color ?? "#465468" }} />
                  <span className="grow min-w-0">
                    <span className="block text-lg font-bold truncate">{d.name}</span>
                    <span className="block text-base text-ink-400">
                      {s?.name ?? "No stage"}
                      {d.expected_close ? ` · closes ${longDate(d.expected_close)}` : ""}
                    </span>
                  </span>
                  <span className="tnum text-2xl font-extrabold shrink-0">
                    {money(Number(d.value), currency, true)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="▤" title="No deals yet"
            action={<Button variant="primary" size="lg" onClick={() => setNewDeal(true)}>
              Create a deal</Button>} />
        )}
      </Card>

      {/* ------------------------------------------------------ follow-ups */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h2 className="text-2xl font-bold tracking-tight">Follow-ups</h2>
          <Button variant="primary" size="md" onClick={() => setNewTask(true)}>＋ Add follow-up</Button>
        </div>
        {myTasks.length ? (
          <ul className="space-y-3">
            {myTasks.map((t) => {
              const rel = relativeDue(t.due_date);
              return (
                <li key={t.id} className="card flex items-center gap-4 p-4">
                  <button
                    onClick={() => toggleTask(t.id)}
                    aria-label={t.status === "done" ? "Mark open" : "Mark done"}
                    className={`focus-ring h-9 w-9 shrink-0 rounded-xl border-2 text-lg font-bold
                      transition-colors ${t.status === "done"
                        ? "bg-emerald-500 border-emerald-400 text-white"
                        : "border-ink-600 hover:border-emerald-400"}`}
                  >
                    {t.status === "done" ? "✓" : ""}
                  </button>
                  <span className={`grow text-lg font-semibold ${
                    t.status === "done" ? "line-through text-ink-500" : ""}`}>
                    {t.title}
                  </span>
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

      <AccountModal open={editAcc} onClose={() => setEditAcc(false)} account={account} />
      <ContactModal open={newContact} onClose={() => setNewContact(false)} seedAccountId={account.id} />
      <DealModal open={newDeal} onClose={() => setNewDeal(false)} seed={{ account_id: account.id }} />
      <TaskModal open={newTask} onClose={() => setNewTask(false)} seed={{ account_id: account.id }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-2xl font-extrabold tnum text-ink-100 mt-1">{value}</div>
    </div>
  );
}
