"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Stage } from "@/lib/types";
import { Button, Card, ConfirmDialog, Field, Input, Select, SectionTitle } from "@/components/ui";

const SWATCHES = [
  "#3987e5", "#d95926", "#199e70", "#9085e9",
  "#c98500", "#d55181", "#008300", "#e66767", "#8a8f98",
];

export default function SettingsPage() {
  const {
    profile, saveProfile, stages, addStage, editStage, removeStage,
    reorderStages, deals, signOut, session,
  } = useStore();

  const [form, setForm] = useState({
    full_name: "", company: "", currency: "USD",
    goal_dials: 250, goal_connects: 60, goal_meetings: 10,
    goal_closes: 2, goal_revenue: 10000,
  });
  const [saved, setSaved] = useState(false);
  const [delStage, setDelStage] = useState<Stage | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        company: profile.company ?? "",
        currency: profile.currency ?? "USD",
        goal_dials: profile.goal_dials,
        goal_connects: profile.goal_connects,
        goal_meetings: profile.goal_meetings,
        goal_closes: profile.goal_closes,
        goal_revenue: Number(profile.goal_revenue),
      });
    }
  }, [profile]);

  async function save() {
    await saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function move(id: string, dir: -1 | 1) {
    const ids = stages.map((s) => s.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderStages(ids);
  }

  const dealsInStage = (id: string) => deals.filter((d) => d.stage_id === id).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-ink-400 text-lg mt-2">Signed in as {session?.user?.email}</p>
      </div>

      {/* ---------------------------------------------------------- profile */}
      <Card className="p-6 sm:p-7">
        <SectionTitle title="Your details" />
        <div className="grid sm:grid-cols-3 gap-5">
          <Field label="Name">
            <Input value={form.full_name}
                   onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="Company">
            <Input value={form.company}
                   onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Currency" hint="Used everywhere money is shown.">
            <Select value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {["USD", "GBP", "EUR", "AUD", "CAD", "NZD", "ZAR", "AED", "INR", "SGD"]
                .map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {/* ------------------------------------------------------------ goals */}
      <Card className="p-6 sm:p-7">
        <SectionTitle
          title="Weekly targets"
          sub="The dashboard scales these by however many weeks your timeframe covers."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {([
            ["goal_dials", "Dials / week"],
            ["goal_connects", "Connects / week"],
            ["goal_meetings", "Meetings / week"],
            ["goal_closes", "Closes / week"],
            ["goal_revenue", "Revenue / week"],
          ] as const).map(([k, label]) => (
            <Field key={k} label={label}>
              <Input
                type="number" min={0}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) || 0 })}
              />
            </Field>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-7">
          <Button variant="primary" size="lg" onClick={save}>Save settings</Button>
          {saved && <span className="text-emerald-300 text-lg font-semibold">Saved ✓</span>}
        </div>
      </Card>

      {/* --------------------------------------------------- pipeline stages */}
      <Card className="p-6 sm:p-7">
        <SectionTitle
          title="Pipeline stages"
          sub="Rename, recolour and reorder to match how you actually sell."
          right={
            <Button
              variant="primary" size="lg"
              onClick={() => addStage({
                name: "New stage", color: SWATCHES[stages.length % SWATCHES.length],
                probability: 50, kind: "open", sort_order: stages.length,
              })}
            >
              ＋ Add stage
            </Button>
          }
        />

        <div className="space-y-4">
          {stages.map((s, i) => (
            <div key={s.id} className="card p-5">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" aria-label="Move up"
                          disabled={i === 0} onClick={() => move(s.id, -1)}>▲</Button>
                  <Button size="sm" aria-label="Move down"
                          disabled={i === stages.length - 1} onClick={() => move(s.id, 1)}>▼</Button>
                </div>

                <Field label="Stage name" className="grow min-w-48">
                  <Input value={s.name}
                         onChange={(e) => editStage(s.id, { name: e.target.value })} />
                </Field>

                <Field label="Type" className="w-40">
                  <Select value={s.kind}
                          onChange={(e) => editStage(s.id, { kind: e.target.value as Stage["kind"] })}>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </Select>
                </Field>

                <Field label="% likely" className="w-28">
                  <Input type="number" min={0} max={100} value={s.probability}
                         onChange={(e) => editStage(s.id, {
                           probability: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                </Field>

                <Button
                  size="md" variant="danger"
                  onClick={() => setDelStage(s)}
                  disabled={stages.length <= 1}
                >
                  Delete
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-4 border-t border-ink-700">
                <span className="text-sm font-bold uppercase tracking-wider text-ink-400 mr-2">
                  Colour
                </span>
                {SWATCHES.map((c) => (
                  <button
                    key={c} aria-label={`Set colour ${c}`}
                    onClick={() => editStage(s.id, { color: c })}
                    className={`focus-ring h-9 w-9 rounded-xl transition-all active:scale-90
                      ${s.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-ink-900" : ""}`}
                    style={{ background: c }}
                  />
                ))}
                <span className="text-sm text-ink-500 ml-auto">
                  {dealsInStage(s.id)} {dealsInStage(s.id) === 1 ? "deal" : "deals"} in this stage
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ----------------------------------------------------------- danger */}
      <Card className="p-6 sm:p-7">
        <SectionTitle title="Account" />
        <Button size="lg" variant="danger" onClick={signOut}>Sign out</Button>
      </Card>

      <ConfirmDialog
        open={!!delStage}
        onCancel={() => setDelStage(null)}
        onConfirm={() => { if (delStage) removeStage(delStage.id); }}
        title={`Delete "${delStage?.name}"?`}
        body={
          delStage && dealsInStage(delStage.id) > 0
            ? `${dealsInStage(delStage.id)} deal(s) sit in this stage. They won't be deleted, but they'll end up with no stage until you move them.`
            : "This stage will be removed from your pipeline."
        }
      />
    </div>
  );
}
