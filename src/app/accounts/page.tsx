"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { colorFor, money, num, titleCase } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Input, Avatar, Select } from "@/components/ui";
import { AccountModal } from "@/components/RecordModals";

const STATUS_COLOR: Record<string, string> = {
  prospect: "#3987e5", active: "#c98500", customer: "#199e70", dead: "#8a8f98",
};

export default function AccountsPage() {
  const { accounts, contacts, deals, profile } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const currency = profile?.currency ?? "USD";

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return accounts
      .filter((a) => status === "all" || a.status === status)
      .filter((a) =>
        !needle ||
        a.name.toLowerCase().includes(needle) ||
        (a.industry ?? "").toLowerCase().includes(needle) ||
        (a.city ?? "").toLowerCase().includes(needle))
      .map((a) => {
        const cs = contacts.filter((c) => c.account_id === a.id);
        const ds = deals.filter((d) => d.account_id === a.id);
        return {
          ...a,
          contactCount: cs.length,
          dealCount: ds.filter((d) => d.status === "open").length,
          openValue: ds.filter((d) => d.status === "open")
                       .reduce((n, d) => n + Number(d.value), 0),
          wonValue: ds.filter((d) => d.status === "won")
                      .reduce((n, d) => n + Number(d.value), 0),
        };
      });
  }, [accounts, contacts, deals, q, status]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Accounts</h1>
          <p className="text-ink-400 text-lg mt-2">
            {num(accounts.length)} companies · {num(contacts.length)} contacts
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
          ＋ New account
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, industry or city…"
          className="grow min-w-64 max-w-xl"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="all">All statuses</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="customer">Customer</option>
          <option value="dead">Dead</option>
        </Select>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="◫"
            title={accounts.length ? "Nothing matches that search" : "No accounts yet"}
            sub={accounts.length
              ? "Try a different search or clear the status filter."
              : "Add the companies you're working — then hang contacts and deals off them."}
            action={!accounts.length
              ? <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
                  Add your first account
                </Button>
              : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <Link
              key={a.id} href={`/accounts/${a.id}`}
              className="card focus-ring p-6 transition-all hover:border-ink-500 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4 mb-5">
                <Avatar text={a.name.slice(0, 2).toUpperCase()} color={colorFor(a.name)} size={52} />
                <div className="min-w-0 grow">
                  <h2 className="text-xl font-bold leading-tight truncate">{a.name}</h2>
                  <p className="text-base text-ink-400 truncate mt-0.5">
                    {a.industry || "—"}{a.city ? ` · ${a.city}` : ""}
                  </p>
                </div>
              </div>

              <Badge color={STATUS_COLOR[a.status] ?? "#8a8f98"}>{titleCase(a.status)}</Badge>

              <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-ink-700">
                <Cell label="Contacts" value={num(a.contactCount)} />
                <Cell label="Open" value={num(a.dealCount)} />
                <Cell label="Value" value={money(a.openValue, currency, true)} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <AccountModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-ink-500">{label}</div>
      <div className="text-lg font-extrabold tnum text-ink-100 mt-1">{value}</div>
    </div>
  );
}
