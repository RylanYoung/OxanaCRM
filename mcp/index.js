#!/usr/bin/env node
/**
 * Oxana — Call & Deal Tracker: MCP server
 * ----------------------------------------------------------------------------
 * Exposes the CRM to Claude as tools, so you can say things like
 *   "add Dana Okafor at Acme as a contact and book a follow-up for Tuesday"
 * and have it land in the same Supabase database the web app reads.
 *
 * Auth: signs in with your normal CRM email + password and works through RLS,
 * so it can only ever touch your own rows. No service-role key on disk.
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, CRM_EMAIL, CRM_PASSWORD
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ setup */

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  CRM_EMAIL,
  CRM_PASSWORD,
} = process.env;

const MISSING = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "CRM_EMAIL", "CRM_PASSWORD"]
  .filter((k) => !process.env[k]);

let sb = null;
let userId = null;

async function connect() {
  if (sb) return sb;
  if (MISSING.length) {
    throw new Error(
      `Missing environment variable(s): ${MISSING.join(", ")}. ` +
      `Set them in your MCP server config.`
    );
  }
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: true },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email: CRM_EMAIL,
    password: CRM_PASSWORD,
  });
  if (error) {
    sb = null;
    throw new Error(`Could not sign in to the CRM: ${error.message}`);
  }
  userId = data.user.id;
  return sb;
}

/* ---------------------------------------------------------------- helpers */

const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);

/** Monday of the week containing a YYYY-MM-DD date (default: today). */
function mondayOf(dateStr) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${dateStr}`);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (utc.getUTCDay() + 6) % 7;
  return iso(new Date(utc.getTime() - dow * DAY));
}

function ok(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(message) {
  return { content: [{ type: "text", text: `ERROR: ${message}` }], isError: true };
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/**
 * Resolve a fuzzy name to exactly one row id.
 * Returns { id } on a clean hit, or throws with the candidate list so Claude
 * can ask which one was meant rather than guessing.
 */
async function resolveOne(table, label, needle, extraSelect = "") {
  if (!needle) return null;
  const sel = `id, ${label}${extraSelect ? `, ${extraSelect}` : ""}`;
  const rows = await must(
    sb.from(table).select(sel).ilike(label, `%${needle}%`).limit(12),
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

/** Accept either a UUID or a name for a relation field. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function relId(table, label, value) {
  if (!value) return null;
  if (UUID.test(value)) return value;
  const row = await resolveOne(table, label, value);
  return row?.id ?? null;
}

/* ------------------------------------------------------------------ tools */

const TOOLS = [
  {
    name: "crm_overview",
    description:
      "Snapshot of the whole CRM: counts of accounts/contacts/deals/tasks, open " +
      "pipeline value, this week's logged activity, and the pipeline stage names. " +
      "Call this first when you need orientation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search",
    description:
      "Free-text search across accounts, contacts and deals at once. Use when the " +
      "user names someone or something and you need to find the record.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Name fragment to search for." } },
      required: ["query"],
    },
  },

  /* ----------------------------------------------------------- accounts */
  {
    name: "list_accounts",
    description: "List accounts (companies), newest first. Optionally filter by status or name.",
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
    description: "Update an existing account. Identify it by id or exact name.",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "string", description: "Account id or name." },
        name: { type: "string" },
        industry: { type: "string" },
        website: { type: "string" },
        phone: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
        employees: { type: "string" },
        status: { type: "string", enum: ["prospect", "active", "customer", "dead"] },
        notes: { type: "string" },
      },
      required: ["account"],
    },
  },

  /* ----------------------------------------------------------- contacts */
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
      "Create a person. `account` may be an account name — it is resolved to an id, " +
      "and the account is NOT auto-created, so create it first if it's new.",
    inputSchema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        title: { type: "string", description: "Job title." },
        account: { type: "string", description: "Account id or name." },
        email: { type: "string" },
        phone: { type: "string" },
        mobile: { type: "string" },
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
        first_name: { type: "string" },
        last_name: { type: "string" },
        title: { type: "string" },
        account: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        mobile: { type: "string" },
        linkedin: { type: "string" },
        status: {
          type: "string",
          enum: ["new", "contacted", "interested", "meeting", "customer", "not_interested"],
        },
        notes: { type: "string" },
      },
      required: ["contact"],
    },
  },

  /* -------------------------------------------------------------- deals */
  {
    name: "list_stages",
    description: "List the pipeline stages in order, with their win/lost kind and probability.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_deals",
    description: "List deals, with account/contact/stage names resolved.",
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
    description:
      "Create a deal in the pipeline. Defaults to the first stage if none given.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        value: { type: "number", description: "Deal value in your currency." },
        account: { type: "string", description: "Account id or name." },
        contact: { type: "string", description: "Contact id or name." },
        stage: { type: "string", description: "Stage id or name." },
        expected_close: { type: "string", description: "YYYY-MM-DD." },
        source: { type: "string" },
        notes: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_deal",
    description: "Update a deal's fields (not its stage — use move_deal for that).",
    inputSchema: {
      type: "object",
      properties: {
        deal: { type: "string", description: "Deal id or name." },
        name: { type: "string" },
        value: { type: "number" },
        account: { type: "string" },
        contact: { type: "string" },
        expected_close: { type: "string", description: "YYYY-MM-DD." },
        source: { type: "string" },
        notes: { type: "string" },
      },
      required: ["deal"],
    },
  },
  {
    name: "move_deal",
    description:
      "Move a deal to a different pipeline stage. Moving into a stage of kind " +
      "'won' or 'lost' closes the deal and stamps its close date automatically.",
    inputSchema: {
      type: "object",
      properties: {
        deal: { type: "string", description: "Deal id or name." },
        stage: { type: "string", description: "Target stage id or name." },
      },
      required: ["deal", "stage"],
    },
  },

  /* -------------------------------------------------------------- tasks */
  {
    name: "list_tasks",
    description: "List follow-up tasks. Defaults to open tasks due soonest first.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "done"], default: "open" },
        due_before: { type: "string", description: "YYYY-MM-DD — only tasks due on/before this." },
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
        due_time: { type: "string", description: "HH:MM, 24h." },
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
    description: "Mark a follow-up done (or reopen it with done=false).",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task id or title." },
        done: { type: "boolean", default: true },
      },
      required: ["task"],
    },
  },

  /* ---------------------------------------------------------- week logs */
  {
    name: "log_week",
    description:
      "Record activity for a week. Any date inside the week works — it snaps to " +
      "that week's Monday. By default the numbers REPLACE what's there; pass " +
      "mode='add' to increment instead (handy for 'I made 40 more dials today').",
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
      "Aggregated activity + conversion rates over a period, plus open pipeline. " +
      "Use for questions like 'how did I do last month' or 'what's my connect rate'.",
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
];

/* -------------------------------------------------------------- handlers */

const FIELDS = {
  account: ["name", "industry", "website", "phone", "city", "country", "employees", "status", "notes"],
  contact: ["first_name", "last_name", "title", "email", "phone", "mobile", "linkedin", "status", "notes"],
  deal: ["name", "value", "expected_close", "source", "notes"],
};

/** Copy only the defined keys from args, so a partial update never nulls fields. */
function pick(args, keys) {
  const out = {};
  for (const k of keys) if (args[k] !== undefined) out[k] = args[k];
  return out;
}

function periodRange(period) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = iso(now);
  const mon = mondayOf();
  const mStart = (yy, mm) => iso(new Date(Date.UTC(yy, mm, 1)));
  const mEnd = (yy, mm) => iso(new Date(Date.UTC(yy, mm + 1, 0)));
  const shift = (d, n) => iso(new Date(new Date(`${d}T00:00:00Z`).getTime() + n * DAY));

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

const RATE = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

async function handle(name, args = {}) {
  await connect();

  switch (name) {
    /* ---------------------------------------------------------- overview */
    case "crm_overview": {
      const [accountsRes, contactsRes, deals, tasks, stages, week] = await Promise.all([
        sb.from("accounts").select("*", { count: "exact", head: true }),
        sb.from("contacts").select("*", { count: "exact", head: true }),
        must(sb.from("deals").select("id,value,status"), "deals"),
        must(sb.from("tasks").select("id,status,due_date"), "tasks"),
        must(sb.from("pipeline_stages").select("id,name,kind,probability,sort_order")
               .order("sort_order"), "stages"),
        must(sb.from("week_logs").select("*").eq("week_start", mondayOf()).maybeSingle(), "week"),
      ]);
      if (accountsRes.error) throw new Error(`accounts: ${accountsRes.error.message}`);
      if (contactsRes.error) throw new Error(`contacts: ${contactsRes.error.message}`);

      const open = deals.filter((d) => d.status === "open");
      const today = iso(new Date());
      return ok({
        counts: {
          accounts: accountsRes.count ?? 0,
          contacts: contactsRes.count ?? 0,
          deals_open: open.length,
          deals_won: deals.filter((d) => d.status === "won").length,
          deals_lost: deals.filter((d) => d.status === "lost").length,
          tasks_open: tasks.filter((t) => t.status === "open").length,
          tasks_overdue: tasks.filter((t) => t.status === "open" && t.due_date < today).length,
        },
        open_pipeline_value: open.reduce((n, d) => n + Number(d.value), 0),
        stages: stages.map((s) => ({ name: s.name, kind: s.kind, probability: s.probability })),
        current_week: week ?? { week_start: mondayOf(), note: "nothing logged yet this week" },
      });
    }

    /* ------------------------------------------------------------ search */
    case "search": {
      const q = `%${args.query}%`;
      const [accounts, contacts, deals] = await Promise.all([
        must(sb.from("accounts").select("id,name,industry,status").ilike("name", q).limit(10), "accounts"),
        must(sb.from("contacts")
               .select("id,first_name,last_name,title,email,phone,status,account_id")
               .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`).limit(10), "contacts"),
        must(sb.from("deals").select("id,name,value,status,stage_id").ilike("name", q).limit(10), "deals"),
      ]);
      return ok({ accounts, contacts, deals });
    }

    /* ---------------------------------------------------------- accounts */
    case "list_accounts": {
      let q = sb.from("accounts").select("*").order("name").limit(args.limit ?? 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.query) q = q.ilike("name", `%${args.query}%`);
      return ok(await must(q, "listing accounts"));
    }

    case "create_account": {
      const row = await must(
        sb.from("accounts").insert({ ...pick(args, FIELDS.account), user_id: userId })
          .select().single(),
        "creating account"
      );
      return ok({ created: "account", ...row });
    }

    case "update_account": {
      const id = await relId("accounts", "name", args.account);
      const row = await must(
        sb.from("accounts").update(pick(args, FIELDS.account)).eq("id", id).select().single(),
        "updating account"
      );
      return ok({ updated: "account", ...row });
    }

    /* ---------------------------------------------------------- contacts */
    case "list_contacts": {
      let q = sb.from("contacts").select("*").order("created_at", { ascending: false })
                .limit(args.limit ?? 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.account) q = q.eq("account_id", await relId("accounts", "name", args.account));
      if (args.query) {
        const n = `%${args.query}%`;
        q = q.or(`first_name.ilike.${n},last_name.ilike.${n},email.ilike.${n}`);
      }
      return ok(await must(q, "listing contacts"));
    }

    case "create_contact": {
      const row = await must(
        sb.from("contacts").insert({
          ...pick(args, FIELDS.contact),
          account_id: await relId("accounts", "name", args.account),
          user_id: userId,
        }).select().single(),
        "creating contact"
      );
      return ok({ created: "contact", ...row });
    }

    case "update_contact": {
      const id = await relId("contacts", "first_name", args.contact);
      const patch = pick(args, FIELDS.contact);
      if (args.account !== undefined) {
        patch.account_id = await relId("accounts", "name", args.account);
      }
      const row = await must(
        sb.from("contacts").update(patch).eq("id", id).select().single(),
        "updating contact"
      );
      return ok({ updated: "contact", ...row });
    }

    /* ------------------------------------------------------------- deals */
    case "list_stages":
      return ok(await must(
        sb.from("pipeline_stages").select("*").order("sort_order"), "listing stages"));

    case "list_deals": {
      let q = sb.from("deals")
        .select("*, accounts(name), contacts(first_name,last_name), pipeline_stages(name,kind)")
        .order("updated_at", { ascending: false })
        .limit(args.limit ?? 50);
      if (args.status) q = q.eq("status", args.status);
      if (args.stage) q = q.eq("stage_id", await relId("pipeline_stages", "name", args.stage));
      if (args.account) q = q.eq("account_id", await relId("accounts", "name", args.account));
      return ok(await must(q, "listing deals"));
    }

    case "create_deal": {
      let stageId = await relId("pipeline_stages", "name", args.stage);
      if (!stageId) {
        const first = await must(
          sb.from("pipeline_stages").select("id").order("sort_order").limit(1).maybeSingle(),
          "finding default stage"
        );
        stageId = first?.id ?? null;
      }
      const row = await must(
        sb.from("deals").insert({
          ...pick(args, FIELDS.deal),
          value: Number(args.value) || 0,
          stage_id: stageId,
          account_id: await relId("accounts", "name", args.account),
          contact_id: await relId("contacts", "first_name", args.contact),
          user_id: userId,
        }).select().single(),
        "creating deal"
      );
      return ok({ created: "deal", ...row });
    }

    case "update_deal": {
      const id = await relId("deals", "name", args.deal);
      const patch = pick(args, FIELDS.deal);
      if (args.value !== undefined) patch.value = Number(args.value) || 0;
      if (args.account !== undefined) patch.account_id = await relId("accounts", "name", args.account);
      if (args.contact !== undefined) patch.contact_id = await relId("contacts", "first_name", args.contact);
      const row = await must(
        sb.from("deals").update(patch).eq("id", id).select().single(), "updating deal");
      return ok({ updated: "deal", ...row });
    }

    case "move_deal": {
      const id = await relId("deals", "name", args.deal);
      const deal = await must(
        sb.from("deals").select("id,name,stage_id,closed_at").eq("id", id).single(), "reading deal");
      const stage = await resolveOne("pipeline_stages", "name", args.stage, "kind");
      const status = stage.kind === "won" ? "won" : stage.kind === "lost" ? "lost" : "open";
      const closed_at =
        stage.kind === "open" ? null : (deal.closed_at ?? new Date().toISOString());

      const row = await must(
        sb.from("deals").update({ stage_id: stage.id, status, closed_at })
          .eq("id", id).select().single(),
        "moving deal"
      );
      await must(
        sb.from("deal_stage_events").insert({
          user_id: userId, deal_id: id,
          from_stage_id: deal.stage_id, to_stage_id: stage.id,
        }),
        "logging stage change"
      );
      return ok({ moved: deal.name, to_stage: stage.name, status, deal: row });
    }

    /* ------------------------------------------------------------- tasks */
    case "list_tasks": {
      let q = sb.from("tasks")
        .select("*, contacts(first_name,last_name), accounts(name), deals(name)")
        .order("due_date").limit(args.limit ?? 50);
      q = q.eq("status", args.status ?? "open");
      if (args.due_before) q = q.lte("due_date", args.due_before);
      return ok(await must(q, "listing tasks"));
    }

    case "create_task": {
      const row = await must(
        sb.from("tasks").insert({
          title: args.title,
          notes: args.notes ?? null,
          due_date: args.due_date ?? iso(new Date()),
          due_time: args.due_time ?? null,
          type: args.type ?? "follow_up",
          priority: args.priority ?? "normal",
          contact_id: await relId("contacts", "first_name", args.contact),
          account_id: await relId("accounts", "name", args.account),
          deal_id: await relId("deals", "name", args.deal),
          user_id: userId,
        }).select().single(),
        "creating task"
      );
      return ok({ created: "task", ...row });
    }

    case "complete_task": {
      const id = await relId("tasks", "title", args.task);
      const done = args.done !== false;
      const row = await must(
        sb.from("tasks").update({
          status: done ? "done" : "open",
          completed_at: done ? new Date().toISOString() : null,
        }).eq("id", id).select().single(),
        "updating task"
      );
      return ok({ [done ? "completed" : "reopened"]: row.title, ...row });
    }

    /* --------------------------------------------------------- week logs */
    case "log_week": {
      const week = mondayOf(args.week_of);
      const NUMS = ["dials", "connects", "conversations", "meetings_booked",
                    "meetings_held", "proposals_submitted", "closes", "revenue"];

      const existing = await must(
        sb.from("week_logs").select("*").eq("week_start", week).maybeSingle(),
        "reading week"
      );

      const row = { user_id: userId, week_start: week };
      for (const k of NUMS) {
        if (args[k] === undefined) continue;
        row[k] = args.mode === "add"
          ? (Number(existing?.[k]) || 0) + Number(args[k])
          : Number(args[k]);
      }
      if (args.notes !== undefined) row.notes = args.notes;

      if (Object.keys(row).length === 2) {
        return ok({ week_start: week, unchanged: true, current: existing ?? null });
      }

      const saved = await must(
        sb.from("week_logs").upsert(row, { onConflict: "user_id,week_start" }).select().single(),
        "saving week"
      );
      return ok({ logged: week, mode: args.mode ?? "set", ...saved });
    }

    case "get_weeks": {
      let q = sb.from("week_logs").select("*")
                .order("week_start", { ascending: false }).limit(args.limit ?? 26);
      if (args.from) q = q.gte("week_start", mondayOf(args.from));
      if (args.to) q = q.lte("week_start", mondayOf(args.to));
      return ok(await must(q, "reading weeks"));
    }

    case "get_stats": {
      const period = args.period ?? "last_12_months";
      const [from, to] = periodRange(period);

      const weeks = await must(
        sb.from("week_logs").select("*")
          .gte("week_start", mondayOf(from)).lte("week_start", to)
          .order("week_start"),
        "reading weeks"
      );
      const deals = await must(sb.from("deals").select("value,status,closed_at"), "reading deals");

      const t = {
        dials: 0, connects: 0, conversations: 0, meetings_booked: 0,
        meetings_held: 0, proposals_submitted: 0, closes: 0, revenue: 0,
      };
      for (const w of weeks) for (const k of Object.keys(t)) t[k] += Number(w[k]) || 0;

      const inRange = (d) => {
        const day = (d.closed_at ?? "").slice(0, 10);
        return day >= from && day <= to;
      };
      const open = deals.filter((d) => d.status === "open");
      const won = deals.filter((d) => d.status === "won" && inRange(d));
      const lost = deals.filter((d) => d.status === "lost" && inRange(d));

      return ok({
        period, from, to,
        weeks_logged: weeks.length,
        activity: t,
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
      });
    }

    default:
      return fail(`Unknown tool: ${name}`);
  }
}

/* ----------------------------------------------------------------- serve */

const server = new Server(
  { name: "sales-crm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return await handle(req.params.name, req.params.arguments ?? {});
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
});

if (process.argv.includes("--selftest")) {
  // Verifies credentials and connectivity without starting the stdio loop.
  connect()
    .then(() => handle("crm_overview"))
    .then((r) => { console.log(r.content[0].text); process.exit(0); })
    .catch((e) => { console.error(`SELFTEST FAILED: ${e.message}`); process.exit(1); });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("sales-crm MCP server ready on stdio");
}
