"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Account, Contact, Task } from "@/lib/types";
import { fullName } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { Button, ConfirmDialog, Field, Input, Modal, Select, Textarea } from "./ui";

/* ---------------------------------------------------------- AccountModal */

export function AccountModal({
  open, onClose, account,
}: { open: boolean; onClose: () => void; account?: Account | null }) {
  const { addAccount, editAccount, removeAccount } = useStore();
  const [f, setF] = useState<Partial<Account>>({});
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (open) setF(account ?? { name: "", status: "prospect" });
  }, [open, account]);

  const set = (p: Partial<Account>) => setF((x) => ({ ...x, ...p }));

  async function save() {
    if (!f.name?.trim()) return;
    const payload = {
      name: f.name.trim(),
      website: f.website?.trim() || null,
      industry: f.industry?.trim() || null,
      phone: f.phone?.trim() || null,
      city: f.city?.trim() || null,
      country: f.country?.trim() || null,
      employees: f.employees?.trim() || null,
      status: f.status ?? "prospect",
      notes: f.notes?.trim() || null,
    };
    if (account) await editAccount(account.id, payload);
    else await addAccount(payload);
    onClose();
  }

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title={account ? "Edit account" : "New account"}
        sub={account ? account.name : "A company you're selling into."}
        footer={
          <>
            {account && (
              <Button size="lg" variant="danger" className="mr-auto" onClick={() => setDel(true)}>
                Delete
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="lg" variant="primary" onClick={save} disabled={!f.name?.trim()}>
              {account ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Company name">
            <Input value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })}
                   placeholder="Acme Industries" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Industry">
              <Input value={f.industry ?? ""} onChange={(e) => set({ industry: e.target.value })}
                     placeholder="Logistics" />
            </Field>
            <Field label="Status">
              <Select value={f.status ?? "prospect"}
                      onChange={(e) => set({ status: e.target.value as Account["status"] })}>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="customer">Customer</option>
                <option value="dead">Dead</option>
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Website">
              <Input value={f.website ?? ""} onChange={(e) => set({ website: e.target.value })}
                     placeholder="acme.com" />
            </Field>
            <Field label="Phone">
              <Input value={f.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="City">
              <Input value={f.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={f.country ?? ""} onChange={(e) => set({ country: e.target.value })} />
            </Field>
            <Field label="Headcount">
              <Input value={f.employees ?? ""} onChange={(e) => set({ employees: e.target.value })}
                     placeholder="50-200" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={4} value={f.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={del} onCancel={() => setDel(false)}
        onConfirm={() => { if (account) removeAccount(account.id); onClose(); }}
        title="Delete this account?"
        body={`"${account?.name}" will be deleted. Its contacts stay, but lose their company link.`}
      />
    </>
  );
}

/* ---------------------------------------------------------- ContactModal */

export function ContactModal({
  open, onClose, contact, seedAccountId,
}: {
  open: boolean; onClose: () => void;
  contact?: Contact | null; seedAccountId?: string | null;
}) {
  const { accounts, addContact, editContact, removeContact } = useStore();
  const [f, setF] = useState<Partial<Contact>>({});
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (open) {
      setF(contact ?? {
        first_name: "", status: "new", account_id: seedAccountId ?? null,
      });
    }
  }, [open, contact, seedAccountId]);

  const set = (p: Partial<Contact>) => setF((x) => ({ ...x, ...p }));

  async function save() {
    if (!f.first_name?.trim()) return;
    const payload = {
      first_name: f.first_name.trim(),
      last_name: f.last_name?.trim() || null,
      title: f.title?.trim() || null,
      email: f.email?.trim() || null,
      phone: f.phone?.trim() || null,
      mobile: f.mobile?.trim() || null,
      linkedin: f.linkedin?.trim() || null,
      account_id: f.account_id || null,
      status: f.status ?? "new",
      notes: f.notes?.trim() || null,
    };
    if (contact) await editContact(contact.id, payload);
    else await addContact(payload);
    onClose();
  }

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title={contact ? "Edit contact" : "New contact"}
        sub={contact ? fullName(contact) : "A person you can call."}
        footer={
          <>
            {contact && (
              <Button size="lg" variant="danger" className="mr-auto" onClick={() => setDel(true)}>
                Delete
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="lg" variant="primary" onClick={save} disabled={!f.first_name?.trim()}>
              {contact ? "Save changes" : "Create contact"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="First name">
              <Input value={f.first_name ?? ""}
                     onChange={(e) => set({ first_name: e.target.value })} placeholder="Dana" />
            </Field>
            <Field label="Last name">
              <Input value={f.last_name ?? ""}
                     onChange={(e) => set({ last_name: e.target.value })} placeholder="Okafor" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Job title">
              <Input value={f.title ?? ""} onChange={(e) => set({ title: e.target.value })}
                     placeholder="Head of Ops" />
            </Field>
            <Field label="Company">
              <Select value={f.account_id ?? ""}
                      onChange={(e) => set({ account_id: e.target.value || null })}>
                <option value="">None</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Email">
              <Input type="email" value={f.email ?? ""}
                     onChange={(e) => set({ email: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={f.status ?? "new"}
                      onChange={(e) => set({ status: e.target.value as Contact["status"] })}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="meeting">Meeting booked</option>
                <option value="customer">Customer</option>
                <option value="not_interested">Not interested</option>
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Phone">
              <Input value={f.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="Mobile">
              <Input value={f.mobile ?? ""} onChange={(e) => set({ mobile: e.target.value })} />
            </Field>
          </div>
          <Field label="LinkedIn">
            <Input value={f.linkedin ?? ""} onChange={(e) => set({ linkedin: e.target.value })}
                   placeholder="linkedin.com/in/…" />
          </Field>
          <Field label="Notes">
            <Textarea rows={4} value={f.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={del} onCancel={() => setDel(false)}
        onConfirm={() => { if (contact) removeContact(contact.id); onClose(); }}
        title="Delete this contact?"
        body={`${contact ? fullName(contact) : "This contact"} will be removed permanently.`}
      />
    </>
  );
}

/* ------------------------------------------------------------- TaskModal */

export function TaskModal({
  open, onClose, task, seed,
}: {
  open: boolean; onClose: () => void;
  task?: Task | null; seed?: Partial<Task>;
}) {
  const { accounts, contacts, deals, addTask, editTask, removeTask } = useStore();
  const [f, setF] = useState<Partial<Task>>({});
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (open) {
      setF(task ?? {
        title: "", type: "follow_up", priority: "normal",
        due_date: todayISO(), status: "open", ...seed,
      });
    }
  }, [open, task, seed]);

  const set = (p: Partial<Task>) => setF((x) => ({ ...x, ...p }));

  async function save() {
    if (!f.title?.trim()) return;
    const payload = {
      title: f.title.trim(),
      notes: f.notes?.trim() || null,
      due_date: f.due_date || todayISO(),
      due_time: f.due_time || null,
      type: f.type ?? "follow_up",
      priority: f.priority ?? "normal",
      account_id: f.account_id || null,
      contact_id: f.contact_id || null,
      deal_id: f.deal_id || null,
    };
    if (task) await editTask(task.id, payload);
    else await addTask(payload);
    onClose();
  }

  const quick = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    set({ due_date: d.toISOString().slice(0, 10) });
  };

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title={task ? "Edit follow-up" : "New follow-up"}
        sub="Anything you need to come back to."
        footer={
          <>
            {task && (
              <Button size="lg" variant="danger" className="mr-auto" onClick={() => setDel(true)}>
                Delete
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="lg" variant="primary" onClick={save} disabled={!f.title?.trim()}>
              {task ? "Save changes" : "Schedule it"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="What needs doing?">
            <Input value={f.title ?? ""} onChange={(e) => set({ title: e.target.value })}
                   placeholder="Call Dana back about pricing" />
          </Field>

          <Field label="When" hint="Tap a shortcut or pick an exact date.">
            <div className="flex flex-wrap gap-2.5 mb-3">
              {([["Today", 0], ["Tomorrow", 1], ["In 3 days", 3],
                 ["Next week", 7], ["In 2 weeks", 14], ["In a month", 30]] as const)
                .map(([label, days]) => (
                  <Button key={label} size="md" onClick={() => quick(days)}>{label}</Button>
                ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Input type="date" value={f.due_date ?? ""}
                     onChange={(e) => set({ due_date: e.target.value })} />
              <Input type="time" value={f.due_time ?? ""}
                     onChange={(e) => set({ due_time: e.target.value || null })} />
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Type">
              <Select value={f.type ?? "follow_up"}
                      onChange={(e) => set({ type: e.target.value as Task["type"] })}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="follow_up">Follow-up</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={f.priority ?? "normal"}
                      onChange={(e) => set({ priority: e.target.value as Task["priority"] })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="Account">
              <Select value={f.account_id ?? ""}
                      onChange={(e) => set({ account_id: e.target.value || null })}>
                <option value="">None</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Contact">
              <Select value={f.contact_id ?? ""}
                      onChange={(e) => set({ contact_id: e.target.value || null })}>
                <option value="">None</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
              </Select>
            </Field>
            <Field label="Deal">
              <Select value={f.deal_id ?? ""}
                      onChange={(e) => set({ deal_id: e.target.value || null })}>
                <option value="">None</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea rows={3} value={f.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={del} onCancel={() => setDel(false)}
        onConfirm={() => { if (task) removeTask(task.id); onClose(); }}
        title="Delete this follow-up?" body="It will be removed permanently."
      />
    </>
  );
}
