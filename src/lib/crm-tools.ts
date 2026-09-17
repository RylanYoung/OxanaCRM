import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The CRM's tool surface, shared by the hosted MCP endpoint.
 *
 * Every call runs through a Supabase client that is signed in as the CRM owner,
 * so row-level security applies exactly as it does in the browser. Nothing here
 * uses a service-role key.
 */

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing a YYYY-MM-DD date (default: today). */
export function mondayOf(dateStr?: string): string {
  const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${dateStr}`);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (utc.getUTCDay() + 6) % 7;
  return iso(new Date(utc.getTime() - dow * DAY));
}

type Args = Record<string, string | number | boolean | undefined>;

export const TOOLS = [
  {
    name: "crm_overview",
    description:
      "Snapshot of the whole CRM: counts of accounts, contacts, deals and tasks, open " +
      "pipeline value, this week's logged activity, and the pipeline stage names. " +
      "Call this first when you need orientation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search",
    description:
      "Free-text search across accounts, contacts and deals at once. Use when the user " +
      "names someone or something and you need to find the record.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Name fragment to search for." } },
      required: ["query"],
    },
  },
  {
    name: "list_accounts",
    description: "List accounts (companies). Optionally filter by status or name.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["prospect", "active", "customer", "dead"] },
        query: { type: "string", description: "Filter by name fragment." },
        limit: { type: "integer", default: 50 },
      },
    },
  },
  {
    name: "create_account",
    description: "Create a company/account record.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        industry: { type: "string" },
        website: { type: "string" },
        phone: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
        employees: { type: "string", description: "Headcount, e.g. '50-200'." },
        status: { type: "string", enum: ["prospect", "active", "customer", "dead"] },
        notes: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_account",
    description: "Update an existing account. Identify it by id or name.",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "string", description: "Account id or name." },
        name: { type: "string" }, industry: { type: "string" }, website: { type: "string" },
        phone: { type: "string" }, city: { type: "string" }, country: { type: "string" },
        employees: { type: "string" },
        status: { type: "string", enum: ["prospect", "active", "customer", "dead"] },
        notes: { type: "string" },
      },
      required: ["account"],
    },
  },
  {
    name: "list_contacts",
    description: "List contacts. Filter by status, account, or a name/email fragment.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        account: { type: "string", description: "Account id or name." },
        status: {
          type: "string",
          enum: ["new", "contacted", "interested", "meeting", "customer", "not_interested"],
        },
        limit: { type: "integer", default: 50 },
      },
    },
  },
  {
    name: "create_contact",
    description:
      "Create a person. `account` may be an account name and is resolved to an id. The " +
      "account is NOT auto-created, so create it first if it is new.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string" }, last_name: { type: "string" },
        title: { type: "string", description: "Job title." },
        account: { type: "string", description: "Account id or name." },
        email: { type: "string" }, phone: { type: "string" }, mobile: { type: "string" },
        linkedin: { type: "string" },
        status: {
          type: "string",
          enum: ["new", "contacted", "interested", "meeting", "customer", "not_interested"],
        },
        notes: { type: "string" },
      },
      required: ["first_name"],
    },
  },
  {
    name: "update_contact",
    description: "Update a contact. Identify by id or name.",
    inputSchema: {
      type: "object",
      properties: {
        contact: { type: "string", description: "Contact id, or first/last name." },
        first_name: { type: "string" }, last_name: { type: "string" },
        title: { type: "string" }, account: { type: "string" }, email: { type: "string" },
        phone: { type: "string" }, mobile: { type: "string" }, linkedin: { type: "string" },
        status: {
          type: "string",
          enum: ["new", "contacted", "interested", "meeting", "customer", "not_interested"],
        },
        notes: { type: "string" },
      },
      required: ["contact"],
    },
  },
  {
    name: "list_stages",
    description: "List the pipeline stages in order, with win/lost kind and probability.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_deals",
    description: "List deals, with account, contact and stage names resolved.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "won", "lost"] },
        stage: { type: "string", description: "Stage id or name." },
        account: { type: "string", description: "Account id or name." },
        limit: { type: "integer", default: 50 },
      },
    },
  },
  {
    name: "create_deal",
    description: "Create a deal. Defaults to the first pipeline stage if none is given.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        value: { type: "number", description: "Deal value in the account's currency." },
        account: { type: "string", description: "Account id or name." },
        contact: { type: "string", description: "Contact id or name." },
        stage: { type: "string", description: "Stage id or name." },
        expected_close: { type: "string", description: "YYYY-MM-DD." },
        source: { type: "string" }, notes: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_deal",
    description: "Update a deal's fields. Use move_deal to change its stage.",
    inputSchema: {
      type: "object",
      properties: {
        deal: { type: "string", description: "Deal id or name." },
        name: { type: "string" }, value: { type: "number" },
        account: { type: "string" }, contact: { type: "string" },
        expected_close: { type: "string", description: "YYYY-MM-DD." },
        source: { type: "string" }, notes: { type: "string" },
      },
      required: ["deal"],
    },
  },
  {
    name: "move_deal",
    description:
      "Move a deal to a different pipeline stage. Moving into a stage of kind 'won' or " +
      "'lost' closes the deal and stamps its close date automatically.",
    inputSchema: {
      type: "object",
      properties: {
        deal: { type: "string", description: "Deal id or name." },
        stage: { type: "string", description: "Target stage id or name." },
      },
      required: ["deal", "stage"],
    },
  },
  {
    name: "list_tasks",
    description: "List follow-up tasks. Defaults to open tasks, soonest due first.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "done"], default: "open" },
        due_before: { type: "string", description: "YYYY-MM-DD. Only tasks due on or before this." },
        limit: { type: "integer", default: 50 },
      },
    },
  },
  {
    name: "create_task",
    description: "Schedule a follow-up, optionally linked to a contact, account or deal.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD. Defaults to today." },
        due_time: { type: "string", description: "HH:MM, 24 hour." },
        type: { type: "string", enum: ["call", "email", "meeting", "follow_up", "other"] },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        contact: { type: "string", description: "Contact id or name." },
        account: { type: "string", description: "Account id or name." },
        deal: { type: "string", description: "Deal id or name." },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a follow-up done, or reopen it with done=false.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task id or title." },
        done: { type: "boolean", default: true },
      },
      required: ["task"],
    },
  },
  {
    name: "log_week",
    description:
      "Record activity for a week. Any date inside the week works, it snaps to that " +
      "week's Monday. By default the numbers REPLACE what is there. Pass mode='add' to " +
      "increment instead, for 'I made 40 more dials today'.",
    inputSchema: {
      type: "object",
      properties: {
        week_of: { type: "string", description: "Any YYYY-MM-DD in the week. Defaults to this week." },
        mode: { type: "string", enum: ["set", "add"], default: "set" },
        dials: { type: "integer" },
        connects: { type: "integer", description: "Calls that were answered." },
        conversations: { type: "integer" },
        meetings_booked: { type: "integer" },
        meetings_held: { type: "integer" },
        proposals_submitted: { type: "integer" },
        closes: { type: "integer" },
        revenue: { type: "number" },
        notes: { type: "string" },
      },
    },
  },
  {
    name: "get_weeks",
    description: "Read logged weeks in a date range, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD." },
        to: { type: "string", description: "YYYY-MM-DD." },
        limit: { type: "integer", default: 26 },
      },
    },
  },
  {
    name: "get_stats",
    description:
      "Aggregated activity and conversion rates over a period, plus open pipeline. Use " +
      "for 'how did I do last month' or 'what is my connect rate'.",
    inputSchema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "last_4_weeks", "this_month", "last_month",
                 "last_3_months", "last_6_months", "last_12_months", "ytd", "all"],
          default: "last_12_months",
        },
      },
    },
  },
] as const;

/* ---------------------------------------------------------------- helpers */

const FIELDS = {
  account: ["name", "industry", "website", "phone", "city", "country", "employees", "status", "notes"],
  contact: ["first_name", "last_name", "title", "email", "phone", "mobile", "linkedin", "status", "notes"],
  deal: ["name", "value", "expected_close", "source", "notes"],
};

function pick(args: Args, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (args[k] !== undefined) out[k] = args[k];
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/**
 * Resolve a fuzzy name to exactly one row. Throws with the candidate list when
 * ambiguous, so the caller can ask rather than silently pick the wrong record.
 */
async function resolveOne(
  sb: SupabaseClient, table: string, label: string, needle: string, extra = ""
): Promise<Record<string, string>> {
  const sel = `id, ${label}${extra ? `, ${extra}` : ""}`;
  const rows = await must<Record<string, string>[]>(
    sb.from(table).select(sel).ilike(label, `%${needle}%`).limit(12) as never,
    `looking up ${table}`
  );
  if (!rows.length) throw new Error(`No ${table} matching "${needle}".`);
  const exact = rows.filter((r) => String(r[label]).toLowerCase() === needle.toLowerCase());
  if (exact.length === 1) return exact[0];
  if (rows.length === 1) return rows[0];
  throw new Error(
    `"${needle}" matches ${rows.length} rows in ${table}: ` +
    rows.map((r) => `${r[label]} (${r.id})`).join(", ") +
    `. Re-run with the exact name or the id.`
  );
}

async function relId(
  sb: SupabaseClient, table: string, label: string, value?: string | number | boolean
): Promise<string | null> {
  if (value === undefined || value === null || value === "") return null;
  const v = String(value);
  if (UUID.test(v)) return v;
  return (await resolveOne(sb, table, label, v)).id ?? null;
}

function periodRange(period: string): [string, string] {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const today = iso(now), mon = mondayOf();
  const mStart = (yy: number, mm: number) => iso(new Date(Date.UTC(yy, mm, 1)));
  const mEnd = (yy: number, mm: number) => iso(new Date(Date.UTC(yy, mm + 1, 0)));
  const shift = (d: string, n: number) => iso(new Date(new Date(`${d}T00:00:00Z`).getTime() + n * DAY));

  switch (period) {
    case "this_week":      return [mon, shift(mon, 6)];
    case "last_week":      return [shift(mon, -7), shift(mon, -1)];
    case "last_4_weeks":   return [shift(mon, -21), shift(mon, 6)];
    case "this_month":     return [mStart(y, m), mEnd(y, m)];
    case "last_month":     return [mStart(y, m - 1), mEnd(y, m - 1)];
    case "last_3_months":  return [mStart(y, m - 2), today];
    case "last_6_months":  return [mStart(y, m - 5), today];
    case "last_12_months": return [mStart(y, m - 11), today];
    case "ytd":            return [iso(new Date(Date.UTC(y, 0, 1))), today];
    default:               return ["2000-01-01", "2099-12-31"];
  }
}

const RATE = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);

/* ------------------------------------------------------------ dispatcher */

export async function callTool(
  sb: SupabaseClient, userId: string, name: string, args: Args = {}
): Promise<unknown> {
  switch (name) {
    case "crm_overview": {
      const [accRes, conRes, deals, tasks, stages, week] = await Promise.all([
        sb.from("accounts").select("*", { count: "exact", head: true }),
        sb.from("contacts").select("*", { count: "exact", head: true }),
        must<{ value: number; status: string }[]>(sb.from("deals").select("id,value,status") as never, "deals"),
        must<{ status: string; due_date: string }[]>(sb.from("tasks").select("id,status,due_date") as never, "tasks"),
        must<{ name: string; kind: string; probability: number }[]>(
          sb.from("pipeline_stages").select("id,name,kind,probability,sort_order").order("sort_order") as never, "stages"),
        must<Record<string, unknown> | null>(
          sb.from("week_logs").select("*").eq("week_start", mondayOf()).maybeSingle() as never, "week"),
      ]);
      const open = deals.filter((d) => d.status === "open");
      const today = iso(new Date());
      return {
        counts: {
          accounts: accRes.count ?? 0,
          contacts: conRes.count ?? 0,
          deals_open: open.length,
          deals_won: deals.filter((d) => d.status === "won").length,
          deals_lost: deals.filter((d) => d.status === "lost").length,
          tasks_open: tasks.filter((t) => t.status === "open").length,
          tasks_overdue: tasks.filter((t) => t.status === "open" && t.due_date < today).length,
        },
        open_pipeline_value: open.reduce((n, d) => n + Number(d.value), 0),
        stages: stages.map((s) => ({ name: s.name, kind: s.kind, probability: s.probability })),
        current_week: week ?? { week_start: mondayOf(), note: "nothing logged yet this week" },
      };
    }

    case "search": {
      const q = `%${args.query}%`;
      const [accounts, contacts, deals] = await Promise.all([
        must(sb.from("accounts").select("id,name,industry,status").ilike("name", q).limit(10) as never, "accounts"),
        must(sb.from("contacts").select("id,first_name,last_name,title,email,phone,status,account_id")
               .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`).limit(10) as never, "contacts"),
        must(sb.from("deals").select("id,name,value,status,stage_id").ilike("name", q).limit(10) as never, "deals"),
      ]);
      return { accounts, contacts, deals };
    }

    case "list_accounts": {
      let q = sb.from("accounts").select("*").order("name").limit(Number(args.limit) || 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.query) q = q.ilike("name", `%${args.query}%`);
      return await must(q as never, "listing accounts");
    }

    case "create_account":
      return {
        created: "account",
        ...(await must(sb.from("accounts").insert({ ...pick(args, FIELDS.account), user_id: userId })
          .select().single() as never, "creating account") as object),
      };

    case "update_account": {
      const id = await relId(sb, "accounts", "name", args.account as string);
      return {
        updated: "account",
        ...(await must(sb.from("accounts").update(pick(args, FIELDS.account)).eq("id", id)
          .select().single() as never, "updating account") as object),
      };
    }

    case "list_contacts": {
      let q = sb.from("contacts").select("*").order("created_at", { ascending: false })
               .limit(Number(args.limit) || 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.account) q = q.eq("account_id", await relId(sb, "accounts", "name", args.account as string));
      if (args.query) {
        const n = `%${args.query}%`;
        q = q.or(`first_name.ilike.${n},last_name.ilike.${n},email.ilike.${n}`);
      }
      return await must(q as never, "listing contacts");
    }

    case "create_contact":
      return {
        created: "contact",
        ...(await must(sb.from("contacts").insert({
          ...pick(args, FIELDS.contact),
          account_id: await relId(sb, "accounts", "name", args.account as string),
          user_id: userId,
        }).select().single() as never, "creating contact") as object),
      };

    case "update_contact": {
      const id = await relId(sb, "contacts", "first_name", args.contact as string);
      const patch = pick(args, FIELDS.contact);
      if (args.account !== undefined) patch.account_id = await relId(sb, "accounts", "name", args.account as string);
      return {
        updated: "contact",
        ...(await must(sb.from("contacts").update(patch).eq("id", id).select().single() as never,
          "updating contact") as object),
      };
    }

    case "list_stages":
      return await must(sb.from("pipeline_stages").select("*").order("sort_order") as never, "listing stages");

    case "list_deals": {
      let q = sb.from("deals")
        .select("*, accounts(name), contacts(first_name,last_name), pipeline_stages(name,kind)")
        .order("updated_at", { ascending: false }).limit(Number(args.limit) || 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.stage) q = q.eq("stage_id", await relId(sb, "pipeline_stages", "name", args.stage as string));
      if (args.account) q = q.eq("account_id", await relId(sb, "accounts", "name", args.account as string));
      return await must(q as never, "listing deals");
    }

    case "create_deal": {
      let stageId = await relId(sb, "pipeline_stages", "name", args.stage as string);
      if (!stageId) {
        const first = await must<{ id: string } | null>(
          sb.from("pipeline_stages").select("id").order("sort_order").limit(1).maybeSingle() as never,
          "finding default stage");
        stageId = first?.id ?? null;
      }
      return {
        created: "deal",
        ...(await must(sb.from("deals").insert({
          ...pick(args, FIELDS.deal),
          value: Number(args.value) || 0,
          stage_id: stageId,
          account_id: await relId(sb, "accounts", "name", args.account as string),
          contact_id: await relId(sb, "contacts", "first_name", args.contact as string),
          user_id: userId,
        }).select().single() as never, "creating deal") as object),
      };
    }

    case "update_deal": {
      const id = await relId(sb, "deals", "name", args.deal as string);
      const patch = pick(args, FIELDS.deal);
      if (args.value !== undefined) patch.value = Number(args.value) || 0;
      if (args.account !== undefined) patch.account_id = await relId(sb, "accounts", "name", args.account as string);
      if (args.contact !== undefined) patch.contact_id = await relId(sb, "contacts", "first_name", args.contact as string);
      return {
        updated: "deal",
        ...(await must(sb.from("deals").update(patch).eq("id", id).select().single() as never,
          "updating deal") as object),
      };
    }

    case "move_deal": {
      const id = await relId(sb, "deals", "name", args.deal as string);
      const deal = await must<{ name: string; stage_id: string | null; closed_at: string | null }>(
        sb.from("deals").select("id,name,stage_id,closed_at").eq("id", id).single() as never, "reading deal");
      const stage = await resolveOne(sb, "pipeline_stages", "name", String(args.stage), "kind");
      const status = stage.kind === "won" ? "won" : stage.kind === "lost" ? "lost" : "open";
      const closed_at = stage.kind === "open" ? null : (deal.closed_at ?? new Date().toISOString());

      const row = await must(sb.from("deals").update({ stage_id: stage.id, status, closed_at })
        .eq("id", id).select().single() as never, "moving deal");
      await must(sb.from("deal_stage_events").insert({
        user_id: userId, deal_id: id, from_stage_id: deal.stage_id, to_stage_id: stage.id,
      }) as never, "logging stage change");
      return { moved: deal.name, to_stage: stage.name, status, deal: row };
    }

    case "list_tasks": {
      let q = sb.from("tasks")
        .select("*, contacts(first_name,last_name), accounts(name), deals(name)")
        .order("due_date").limit(Number(args.limit) || 50)
        .eq("status", (args.status as string) ?? "open");
      if (args.due_before) q = q.lte("due_date", args.due_before);
      return await must(q as never, "listing tasks");
    }

    case "create_task":
      return {
        created: "task",
        ...(await must(sb.from("tasks").insert({
          title: args.title,
          notes: args.notes ?? null,
          due_date: args.due_date ?? iso(new Date()),
          due_time: args.due_time ?? null,
          type: args.type ?? "follow_up",
          priority: args.priority ?? "normal",
          contact_id: await relId(sb, "contacts", "first_name", args.contact as string),
          account_id: await relId(sb, "accounts", "name", args.account as string),
          deal_id: await relId(sb, "deals", "name", args.deal as string),
          user_id: userId,
        }).select().single() as never, "creating task") as object),
      };

    case "complete_task": {
      const id = await relId(sb, "tasks", "title", args.task as string);
      const done = args.done !== false;
      const row = await must<{ title: string }>(sb.from("tasks").update({
        status: done ? "done" : "open",
        completed_at: done ? new Date().toISOString() : null,
      }).eq("id", id).select().single() as never, "updating task");
      return { [done ? "completed" : "reopened"]: row.title, ...row };
    }

    case "log_week": {
      const week = mondayOf(args.week_of as string | undefined);
      const NUMS = ["dials", "connects", "conversations", "meetings_booked",
                    "meetings_held", "proposals_submitted", "closes", "revenue"];
      const existing = await must<Record<string, number> | null>(
        sb.from("week_logs").select("*").eq("week_start", week).maybeSingle() as never, "reading week");

      const row: Record<string, unknown> = { user_id: userId, week_start: week };
      for (const k of NUMS) {
        if (args[k] === undefined) continue;
        row[k] = args.mode === "add"
          ? (Number(existing?.[k]) || 0) + Number(args[k])
          : Number(args[k]);
      }
      if (args.notes !== undefined) row.notes = args.notes;
      if (Object.keys(row).length === 2) {
        return { week_start: week, unchanged: true, current: existing ?? null };
      }
      const saved = await must(sb.from("week_logs")
        .upsert(row, { onConflict: "user_id,week_start" }).select().single() as never, "saving week");
      return { logged: week, mode: args.mode ?? "set", ...(saved as object) };
    }

    case "get_weeks": {
      let q = sb.from("week_logs").select("*")
        .order("week_start", { ascending: false }).limit(Number(args.limit) || 26);
      if (args.from) q = q.gte("week_start", mondayOf(args.from as string));
      if (args.to) q = q.lte("week_start", args.to as string);
      return await must(q as never, "reading weeks");
    }

    case "get_stats": {
      const period = (args.period as string) ?? "last_12_months";
      const [from, to] = periodRange(period);
      const weeks = await must<Record<string, number>[]>(
        sb.from("week_logs").select("*").gte("week_start", mondayOf(from)).lte("week_start", to)
          .order("week_start") as never, "reading weeks");
      const deals = await must<{ value: number; status: string; closed_at: string | null }[]>(
        sb.from("deals").select("value,status,closed_at") as never, "reading deals");

      const t: Record<string, number> = {
        dials: 0, connects: 0, conversations: 0, meetings_booked: 0,
        meetings_held: 0, proposals_submitted: 0, closes: 0, revenue: 0,
      };
      for (const w of weeks) for (const k of Object.keys(t)) t[k] += Number(w[k]) || 0;

      const inRange = (d: { closed_at: string | null }) => {
        const day = (d.closed_at ?? "").slice(0, 10);
        return day >= from && day <= to;
      };
      const open = deals.filter((d) => d.status === "open");
      const won = deals.filter((d) => d.status === "won" && inRange(d));
      const lost = deals.filter((d) => d.status === "lost" && inRange(d));

      return {
        period, from, to, weeks_logged: weeks.length, activity: t,
        rates: {
          connect_rate_pct: RATE(t.connects, t.dials),
          book_rate_pct: RATE(t.meetings_booked, t.connects),
          show_rate_pct: RATE(t.meetings_held, t.meetings_booked),
          close_rate_pct: RATE(t.closes, t.meetings_held),
          dials_per_close: t.closes ? Math.round(t.dials / t.closes) : null,
          avg_deal_size: t.closes ? Math.round(t.revenue / t.closes) : null,
        },
        pipeline: {
          open_count: open.length,
          open_value: open.reduce((n, d) => n + Number(d.value), 0),
          won_count: won.length,
          won_value: won.reduce((n, d) => n + Number(d.value), 0),
          lost_count: lost.length,
          win_rate_pct: RATE(won.length, won.length + lost.length),
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
