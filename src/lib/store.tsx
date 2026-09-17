"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isConfigured } from "./supabase";
import { currentWeekStart } from "./dates";
import type {
  Account, Contact, Deal, Profile, Stage, Task, WeekLog,
} from "./types";

/* ------------------------------------------------------------------ types */

type Toast = { id: number; msg: string; tone: "ok" | "err" };

interface Store {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  error: string | null;

  profile: Profile | null;
  accounts: Account[];
  contacts: Contact[];
  stages: Stage[];
  deals: Deal[];
  tasks: Task[];
  weekLogs: Record<string, WeekLog>;

  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  toast: (msg: string, tone?: "ok" | "err") => void;
  toasts: Toast[];

  saveProfile: (p: Partial<Profile>) => Promise<void>;

  addAccount: (a: Partial<Account>) => Promise<Account | null>;
  editAccount: (id: string, a: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;

  addContact: (c: Partial<Contact>) => Promise<Contact | null>;
  editContact: (id: string, c: Partial<Contact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;

  addStage: (s: Partial<Stage>) => Promise<void>;
  editStage: (id: string, s: Partial<Stage>) => Promise<void>;
  removeStage: (id: string) => Promise<void>;
  reorderStages: (ids: string[]) => Promise<void>;

  addDeal: (d: Partial<Deal>) => Promise<Deal | null>;
  editDeal: (id: string, d: Partial<Deal>) => Promise<void>;
  removeDeal: (id: string) => Promise<void>;
  moveDeal: (id: string, stageId: string) => Promise<void>;

  addTask: (t: Partial<Task>) => Promise<Task | null>;
  editTask: (id: string, t: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;

  saveWeek: (weekStart: string, patch: Partial<WeekLog>) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used inside <StoreProvider>");
  return c;
}

/* --------------------------------------------------------------- provider */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekLogs, setWeekLogs] = useState<Record<string, WeekLog>>({});

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  const toast = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const userId = session?.user?.id ?? null;

  /* ---- auth ---- */
  useEffect(() => {
    if (!isConfigured) { setAuthChecked(true); return; }
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---- bulk load ---- */
  const refresh = useCallback(async () => {
    if (!isConfigured || !userId) return;
    const sb = supabase();
    try {
      const [p, a, c, s, d, t, w] = await Promise.all([
        sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
        sb.from("accounts").select("*").order("name"),
        sb.from("contacts").select("*").order("created_at", { ascending: false }),
        sb.from("pipeline_stages").select("*").order("sort_order"),
        sb.from("deals").select("*").order("sort_order"),
        sb.from("tasks").select("*").order("due_date"),
        sb.from("week_logs").select("*").order("week_start"),
      ]);

      const firstErr = [p, a, c, s, d, t, w].find((r) => r.error)?.error;
      if (firstErr) throw firstErr;

      setProfile((p.data as Profile) ?? null);
      setAccounts((a.data as Account[]) ?? []);
      setContacts((c.data as Contact[]) ?? []);
      setStages((s.data as Stage[]) ?? []);
      setDeals((d.data as Deal[]) ?? []);
      setTasks((t.data as Task[]) ?? []);
      setWeekLogs(
        Object.fromEntries(((w.data as WeekLog[]) ?? []).map((row) => [row.week_start, row]))
      );
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /relation .* does not exist/i.test(msg)
          ? "Your database tables are missing. Run supabase/schema.sql in the Supabase SQL editor."
          : msg
      );
    } finally {
      setLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) { setLoaded(false); refresh(); }
    else { setLoaded(true); }
  }, [userId, refresh]);

  /* ---- generic write helper: optimistic, self-healing on failure ---- */
  const write = useCallback(
    async <T,>(fn: () => Promise<T>, failMsg: string): Promise<T | null> => {
      try {
        return await fn();
      } catch (e) {
        toast(`${failMsg}: ${e instanceof Error ? e.message : e}`, "err");
        refresh();
        return null;
      }
    },
    [toast, refresh]
  );

  const insert = useCallback(
    async <T,>(table: string, row: Record<string, unknown>): Promise<T | null> =>
      write(async () => {
        const { data, error } = await supabase()
          .from(table).insert({ ...row, user_id: userId }).select().single();
        if (error) throw error;
        return data as T;
      }, `Could not save`),
    [userId, write]
  );

  const patch = useCallback(
    async (table: string, id: string, row: Record<string, unknown>) =>
      write(async () => {
        const { error } = await supabase().from(table).update(row).eq("id", id);
        if (error) throw error;
        return true;
      }, `Could not update`),
    [write]
  );

  const destroy = useCallback(
    async (table: string, id: string) =>
      write(async () => {
        const { error } = await supabase().from(table).delete().eq("id", id);
        if (error) throw error;
        return true;
      }, `Could not delete`),
    [write]
  );

  /* ------------------------------------------------------------- profile */
  const saveProfile = useCallback(
    async (p: Partial<Profile>) => {
      if (!userId) return;
      setProfile((old) => (old ? { ...old, ...p } : old));
      await write(async () => {
        const { error } = await supabase()
          .from("profiles").upsert({ id: userId, ...p }, { onConflict: "id" });
        if (error) throw error;
        return true;
      }, "Could not save settings");
    },
    [userId, write]
  );

  /* ------------------------------------------------------------ accounts */
  const addAccount = useCallback(async (a: Partial<Account>) => {
    const row = await insert<Account>("accounts", a as Record<string, unknown>);
    if (row) { setAccounts((x) => [...x, row].sort((m, n) => m.name.localeCompare(n.name))); toast(`Added ${row.name}`); }
    return row;
  }, [insert, toast]);

  const editAccount = useCallback(async (id: string, a: Partial<Account>) => {
    setAccounts((x) => x.map((r) => (r.id === id ? { ...r, ...a } : r)));
    await patch("accounts", id, a as Record<string, unknown>);
  }, [patch]);

  const removeAccount = useCallback(async (id: string) => {
    setAccounts((x) => x.filter((r) => r.id !== id));
    setContacts((x) => x.map((c) => (c.account_id === id ? { ...c, account_id: null } : c)));
    await destroy("accounts", id);
    toast("Account deleted");
  }, [destroy, toast]);

  /* ------------------------------------------------------------ contacts */
  const addContact = useCallback(async (c: Partial<Contact>) => {
    const row = await insert<Contact>("contacts", c as Record<string, unknown>);
    if (row) { setContacts((x) => [row, ...x]); toast(`Added ${row.first_name}`); }
    return row;
  }, [insert, toast]);

  const editContact = useCallback(async (id: string, c: Partial<Contact>) => {
    setContacts((x) => x.map((r) => (r.id === id ? { ...r, ...c } : r)));
    await patch("contacts", id, c as Record<string, unknown>);
  }, [patch]);

  const removeContact = useCallback(async (id: string) => {
    setContacts((x) => x.filter((r) => r.id !== id));
    await destroy("contacts", id);
    toast("Contact deleted");
  }, [destroy, toast]);

  /* -------------------------------------------------------------- stages */
  const addStage = useCallback(async (s: Partial<Stage>) => {
    const row = await insert<Stage>("pipeline_stages", {
      sort_order: stages.length, ...s,
    } as Record<string, unknown>);
    if (row) { setStages((x) => [...x, row].sort((m, n) => m.sort_order - n.sort_order)); toast("Stage added"); }
  }, [insert, stages.length, toast]);

  const editStage = useCallback(async (id: string, s: Partial<Stage>) => {
    setStages((x) => x.map((r) => (r.id === id ? { ...r, ...s } : r)));
    await patch("pipeline_stages", id, s as Record<string, unknown>);
  }, [patch]);

  const removeStage = useCallback(async (id: string) => {
    setStages((x) => x.filter((r) => r.id !== id));
    setDeals((x) => x.map((d) => (d.stage_id === id ? { ...d, stage_id: null } : d)));
    await destroy("pipeline_stages", id);
    toast("Stage removed");
  }, [destroy, toast]);

  const reorderStages = useCallback(async (ids: string[]) => {
    setStages((x) =>
      [...x].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
            .map((s, i) => ({ ...s, sort_order: i })));
    await Promise.all(ids.map((id, i) => patch("pipeline_stages", id, { sort_order: i })));
  }, [patch]);

  /* --------------------------------------------------------------- deals */
  const addDeal = useCallback(async (d: Partial<Deal>) => {
    const row = await insert<Deal>("deals", {
      sort_order: deals.length,
      stage_id: d.stage_id ?? stages[0]?.id ?? null,
      ...d,
    } as Record<string, unknown>);
    if (row) { setDeals((x) => [...x, row]); toast(`Deal "${row.name}" created`); }
    return row;
  }, [insert, deals.length, stages, toast]);

  const editDeal = useCallback(async (id: string, d: Partial<Deal>) => {
    setDeals((x) => x.map((r) => (r.id === id ? { ...r, ...d } : r)));
    await patch("deals", id, d as Record<string, unknown>);
  }, [patch]);

  const removeDeal = useCallback(async (id: string) => {
    setDeals((x) => x.filter((r) => r.id !== id));
    await destroy("deals", id);
    toast("Deal deleted");
  }, [destroy, toast]);

  /**
   * Moving a deal also syncs its win/loss status and closed_at from the target
   * stage's `kind`, and records the move for velocity reporting.
   */
  const moveDeal = useCallback(async (id: string, stageId: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage_id === stageId) return;
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    const status = stage.kind === "won" ? "won" : stage.kind === "lost" ? "lost" : "open";
    const closed_at =
      stage.kind === "open" ? null : (deal.closed_at ?? new Date().toISOString());
    const upd = { stage_id: stageId, status, closed_at } as Partial<Deal>;

    setDeals((x) => x.map((r) => (r.id === id ? { ...r, ...upd } : r)));
    await patch("deals", id, upd as Record<string, unknown>);
    await write(async () => {
      const { error } = await supabase().from("deal_stage_events").insert({
        user_id: userId, deal_id: id,
        from_stage_id: deal.stage_id, to_stage_id: stageId,
      });
      if (error) throw error;
      return true;
    }, "Could not log stage change");

    if (stage.kind === "won") toast(`🎉 ${deal.name} marked WON`);
  }, [deals, stages, patch, write, userId, toast]);

  /* --------------------------------------------------------------- tasks */
  const addTask = useCallback(async (t: Partial<Task>) => {
    const row = await insert<Task>("tasks", t as Record<string, unknown>);
    if (row) { setTasks((x) => [...x, row]); toast("Follow-up scheduled"); }
    return row;
  }, [insert, toast]);

  const editTask = useCallback(async (id: string, t: Partial<Task>) => {
    setTasks((x) => x.map((r) => (r.id === id ? { ...r, ...t } : r)));
    await patch("tasks", id, t as Record<string, unknown>);
  }, [patch]);

  const removeTask = useCallback(async (id: string) => {
    setTasks((x) => x.filter((r) => r.id !== id));
    await destroy("tasks", id);
  }, [destroy]);

  const toggleTask = useCallback(async (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const done = t.status !== "done";
    const upd = {
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    } as Partial<Task>;
    setTasks((x) => x.map((r) => (r.id === id ? { ...r, ...upd } : r)));
    await patch("tasks", id, upd as Record<string, unknown>);
    if (done) toast("Nice, done ✓");
  }, [tasks, patch, toast]);

  /* ----------------------------------------------------------- week logs */
  const saveWeek = useCallback(async (weekStart: string, p: Partial<WeekLog>) => {
    if (!userId) return;
    setWeekLogs((old) => {
      const prev = old[weekStart];
      const base: WeekLog = prev ?? {
        id: `tmp-${weekStart}`, user_id: userId, week_start: weekStart,
        dials: 0, connects: 0, conversations: 0, meetings_booked: 0,
        meetings_held: 0, proposals_submitted: 0, closes: 0, revenue: 0,
        notes: null, created_at: "", updated_at: "",
      };
      return { ...old, [weekStart]: { ...base, ...p } };
    });

    await write(async () => {
      const { data, error } = await supabase()
        .from("week_logs")
        .upsert({ user_id: userId, week_start: weekStart, ...p },
                { onConflict: "user_id,week_start" })
        .select().single();
      if (error) throw error;
      setWeekLogs((old) => ({ ...old, [weekStart]: data as WeekLog }));
      return true;
    }, "Could not save week");
  }, [userId, write]);

  /* ------------------------------------------------------------ sign out */
  const signOut = useCallback(async () => {
    if (isConfigured) await supabase().auth.signOut();
    setProfile(null); setAccounts([]); setContacts([]);
    setStages([]); setDeals([]); setTasks([]); setWeekLogs({});
  }, []);

  const value = useMemo<Store>(() => ({
    ready: authChecked && (loaded || !userId),
    session, userId, error,
    profile, accounts, contacts, stages, deals, tasks, weekLogs,
    refresh, signOut, toast, toasts, saveProfile,
    addAccount, editAccount, removeAccount,
    addContact, editContact, removeContact,
    addStage, editStage, removeStage, reorderStages,
    addDeal, editDeal, removeDeal, moveDeal,
    addTask, editTask, removeTask, toggleTask,
    saveWeek,
  }), [
    authChecked, loaded, session, userId, error, profile, accounts, contacts,
    stages, deals, tasks, weekLogs, refresh, signOut, toast, toasts, saveProfile,
    addAccount, editAccount, removeAccount, addContact, editContact, removeContact,
    addStage, editStage, removeStage, reorderStages, addDeal, editDeal, removeDeal,
    moveDeal, addTask, editTask, removeTask, toggleTask, saveWeek,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------- selectors */

/** Blank week log used when a week has never been touched. */
export function emptyWeek(weekStart: string): WeekLog {
  return {
    id: "", user_id: "", week_start: weekStart,
    dials: 0, connects: 0, conversations: 0, meetings_booked: 0,
    meetings_held: 0, proposals_submitted: 0, closes: 0, revenue: 0,
    notes: null, created_at: "", updated_at: "",
  };
}

export function useCurrentWeek(): WeekLog {
  const { weekLogs } = useStore();
  const wk = currentWeekStart();
  return weekLogs[wk] ?? emptyWeek(wk);
}
