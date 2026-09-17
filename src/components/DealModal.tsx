"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { Button, ConfirmDialog, Field, Input, Modal, Select, Textarea } from "./ui";
import { fullName } from "@/lib/format";

export interface DealDraft extends Partial<Deal> {}

/** Create or edit a deal. Pass `deal` to edit, or `seed` to prefill a new one. */
export function DealModal({
  open, onClose, deal, seed,
}: {
  open: boolean;
  onClose: () => void;
  deal?: Deal | null;
  seed?: DealDraft;
}) {
  const { stages, accounts, contacts, addDeal, editDeal, removeDeal } = useStore();
  const [f, setF] = useState<DealDraft>({});
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      deal ?? {
        name: "", value: 0, stage_id: stages[0]?.id ?? null,
        account_id: null, contact_id: null, expected_close: null,
        source: "", notes: "", status: "open", ...seed,
      }
    );
  }, [open, deal, seed, stages]);

  const set = (p: DealDraft) => setF((x) => ({ ...x, ...p }));

  async function save() {
    if (!f.name?.trim()) return;
    const payload: DealDraft = {
      name: f.name.trim(),
      value: Number(f.value) || 0,
      stage_id: f.stage_id || null,
      account_id: f.account_id || null,
      contact_id: f.contact_id || null,
      expected_close: f.expected_close || null,
      source: f.source?.trim() || null,
      notes: f.notes?.trim() || null,
    };
    if (deal) await editDeal(deal.id, payload);
    else await addDeal(payload);
    onClose();
  }

  // Narrow the contact list to the chosen account, when there is one.
  const pickableContacts = f.account_id
    ? contacts.filter((c) => c.account_id === f.account_id)
    : contacts;

  return (
    <>
      <Modal
        open={open} onClose={onClose}
        title={deal ? "Edit deal" : "New deal"}
        sub={deal ? deal.name : "Add an opportunity to your pipeline."}
        footer={
          <>
            {deal && (
              <Button size="lg" variant="danger" onClick={() => setConfirmDel(true)}
                      className="mr-auto">
                Delete
              </Button>
            )}
            <Button size="lg" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="lg" variant="primary" onClick={save} disabled={!f.name?.trim()}>
              {deal ? "Save changes" : "Create deal"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Deal name">
            <Input value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })}
                   placeholder="Acme 40 seat rollout" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Value">
              <Input type="number" min={0} step="100" value={f.value ?? 0}
                     onChange={(e) => set({ value: Number(e.target.value) })} />
            </Field>
            <Field label="Stage">
              <Select value={f.stage_id ?? ""} onChange={(e) => set({ stage_id: e.target.value })}>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Account">
              <Select
                value={f.account_id ?? ""}
                onChange={(e) => set({ account_id: e.target.value || null, contact_id: null })}
              >
                <option value="">None</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </Field>
            <Field label="Contact">
              <Select value={f.contact_id ?? ""}
                      onChange={(e) => set({ contact_id: e.target.value || null })}>
                <option value="">None</option>
                {pickableContacts.map((c) => (
                  <option key={c.id} value={c.id}>{fullName(c)}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Expected close">
              <Input type="date" value={f.expected_close ?? ""}
                     onChange={(e) => set({ expected_close: e.target.value || null })} />
            </Field>
            <Field label="Source">
              <Input value={f.source ?? ""} onChange={(e) => set({ source: e.target.value })}
                     placeholder="Cold call, referral…" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea rows={4} value={f.notes ?? ""}
                      onChange={(e) => set({ notes: e.target.value })}
                      placeholder="Budget, decision process, next step…" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDel}
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { if (deal) removeDeal(deal.id); onClose(); }}
        title="Delete this deal?"
        body={`"${deal?.name}" will be removed permanently. This can't be undone.`}
      />
    </>
  );
}
