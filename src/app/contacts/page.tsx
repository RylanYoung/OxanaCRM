"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { colorFor, fullName, initials, num, titleCase } from "@/lib/format";
import { Avatar, Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { ContactModal, TaskModal } from "@/components/RecordModals";
import { DealModal } from "@/components/DealModal";

const STATUS_COLOR: Record<string, string> = {
  new: "#3987e5", contacted: "#9085e9", interested: "#c98500",
  meeting: "#d55181", customer: "#199e70", not_interested: "#8a8f98",
};

export default function ContactsPage() {
  const { contacts, accounts, profile } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [taskFor, setTaskFor] = useState<Contact | null>(null);
  const [dealFor, setDealFor] = useState<Contact | null>(null);

  void profile;
  const accName = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts
      .filter((c) => status === "all" || c.status === status)
      .filter((c) => {
        if (!needle) return true;
        const hay = [
          c.first_name, c.last_name, c.title, c.email, c.phone, c.mobile,
          c.account_id ? accName.get(c.account_id) : "",
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(needle);
      });
  }, [contacts, q, status, accName]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Contacts</h1>
          <p className="text-ink-400 text-lg mt-2">{num(contacts.length)} people</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
          ＋ New contact
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)}
               placeholder="Search name, company, email or phone…"
               className="grow min-w-64 max-w-xl" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="meeting">Meeting booked</option>
          <option value="customer">Customer</option>
          <option value="not_interested">Not interested</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="☺"
            title={contacts.length ? "Nothing matches that search" : "No contacts yet"}
            sub={contacts.length
              ? "Try another search or clear the filter."
              : "Add the people you're calling. Anyone interested can become a deal in one tap."}
            action={!contacts.length
              ? <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
                  Add your first contact</Button>
              : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Card key={c.id} className="p-6 flex flex-col">
              <Link href={`/contacts/${c.id}`}
                    className="focus-ring rounded-xl flex items-start gap-4 mb-5 group">
                <Avatar text={initials(c.first_name, c.last_name)}
                        color={colorFor(c.first_name + (c.last_name ?? ""))} size={52} />
                <div className="min-w-0 grow">
                  <h2 className="text-xl font-bold leading-tight truncate group-hover:text-brand-bright transition-colors">
                    {fullName(c)}
                  </h2>
                  <p className="text-base text-ink-400 truncate mt-0.5">{c.title || "No title"}</p>
                  <p className="text-base text-ink-500 truncate">
                    {c.account_id ? accName.get(c.account_id) : "No company"}
                  </p>
                </div>
              </Link>

              <Badge color={STATUS_COLOR[c.status] ?? "#8a8f98"}>{titleCase(c.status)}</Badge>

              <div className="flex flex-wrap gap-2.5 mt-5 pt-5 border-t border-ink-700">
                {c.phone || c.mobile ? (
                  <a href={`tel:${c.mobile || c.phone}`}
                     className="focus-ring inline-flex items-center justify-center h-11 px-4 rounded-xl
                                bg-ink-700/70 border border-ink-600 text-base font-semibold
                                hover:bg-ink-600/70 transition-colors">
                    ☎ Call
                  </a>
                ) : null}
                {c.email && (
                  <a href={`mailto:${c.email}`}
                     className="focus-ring inline-flex items-center justify-center h-11 px-4 rounded-xl
                                bg-ink-700/70 border border-ink-600 text-base font-semibold
                                hover:bg-ink-600/70 transition-colors">
                    ✉ Email
                  </a>
                )}
                <Button size="md" onClick={() => setTaskFor(c)}>⏰ Follow up</Button>
                <Button size="md" variant="primary" onClick={() => setDealFor(c)}>→ Deal</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContactModal open={creating} onClose={() => setCreating(false)} />
      <TaskModal
        open={!!taskFor} onClose={() => setTaskFor(null)}
        seed={taskFor ? {
          contact_id: taskFor.id,
          account_id: taskFor.account_id,
          title: `Follow up with ${fullName(taskFor)}`,
        } : undefined}
      />
      <DealModal
        open={!!dealFor} onClose={() => setDealFor(null)}
        seed={dealFor ? {
          contact_id: dealFor.id,
          account_id: dealFor.account_id,
          name: dealFor.account_id
            ? `${accName.get(dealFor.account_id)} new opportunity`
            : `${fullName(dealFor)} new opportunity`,
        } : undefined}
      />
    </div>
  );
}
