# Sales CRM

A personal sales operating system: log your week's activity, work accounts and
contacts, run a custom pipeline, chase follow-ups — and ask Claude to do any of
it for you through the bundled MCP server.

Built with **Next.js 16 + React 19 + Tailwind 4 + Supabase**.

---

## What's in it

| Page | What it does |
|------|--------------|
| **Dashboard** | Every stat for a timeframe you pick — this week, last month, last 12 months, YTD, all time. Funnel, conversion rates, pipeline by stage, goal tracking. |
| **Week Log** | Pick any week from 2025 through 2028 and punch in dials, connects, conversations, meetings booked/held, proposals, closes and revenue. Autosaves. |
| **Pipeline** | Drag-and-drop kanban. Your own stages, colours, order and win probabilities. Dropping into a Won/Lost column closes the deal automatically. |
| **Accounts** | Companies, with their contacts, deals and follow-ups on one screen. |
| **Contacts** | People. One tap to call, email, schedule a follow-up, or turn them into a deal. |
| **Follow-ups** | Task system grouped into Overdue / Today / Next 7 days / Later. |
| **Settings** | Weekly targets, currency, and full pipeline stage editing. |

---

## Setup

### 1. Database

In your Supabase project open **SQL Editor → New query**, paste the whole of
[`supabase/schema.sql`](supabase/schema.sql), and hit **Run**.

That creates all 8 tables, indexes, row-level-security policies (every row is
locked to your user id), and a trigger that gives any new signup a default
7-stage pipeline. It is safe to run more than once.

### 2. Environment

Copy the example file and fill in your two values:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

Both are in Supabase under **Project Settings → API Keys** (the *anon / public*
key — never the service-role key; it must not go in a browser app).

### 3. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3400>, create your account, and you're in.

> If you signed up *before* running the schema, just re-run `schema.sql` — the
> backfill block at the bottom gives your existing user a profile and the
> default pipeline stages.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) under **Settings → Environment Variables**.
4. Deploy. Nothing else to configure.

---

## The Claude MCP server

Lets you talk to the CRM instead of clicking it:

> *"Add Dana Okafor, Head of Ops at Acme, as a contact — then book me a
> follow-up call for Tuesday and open a £12k deal in Proposal."*

> *"I did 220 dials, 47 connects and booked 9 meetings this week."*

> *"What was my connect rate last month vs the 3 months before?"*

### Install

```bash
cd mcp
npm install
```

### Configure

Add this to your Claude MCP config (`claude mcp add`, or the `mcpServers` block
in `~/.claude.json` / your Claude Desktop config):

```json
{
  "mcpServers": {
    "sales-crm": {
      "command": "node",
      "args": ["C:/Users/User/sales-crm/mcp/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxxxxxxx.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbG...",
        "CRM_EMAIL": "you@example.com",
        "CRM_PASSWORD": "your-crm-password"
      }
    }
  }
}
```

It signs in as **you** with the same credentials you use in the web app, so it
runs through row-level security and can only ever touch your own data. No
service-role key is needed or wanted.

Check it works before wiring it up:

```bash
cd mcp
npm run check
```

That prints a live snapshot of your CRM, or tells you exactly which credential
is wrong.

### Tools it exposes

`crm_overview` · `search` · `list_accounts` · `create_account` ·
`update_account` · `list_contacts` · `create_contact` · `update_contact` ·
`list_stages` · `list_deals` · `create_deal` · `update_deal` · `move_deal` ·
`list_tasks` · `create_task` · `complete_task` · `log_week` · `get_weeks` ·
`get_stats`

Relation fields accept **names**, not just UUIDs — `"account": "Acme"` resolves
on its own. If a name is ambiguous the tool returns the candidates instead of
guessing.

`log_week` snaps any date to that week's Monday and takes `mode: "add"` to
increment ("I made 40 more dials today") or the default `mode: "set"` to
overwrite.

---

## Notes on the build

- **Data loads once** into a React context and updates optimistically, so the
  UI never waits on a round-trip.
- **Dates are pure UTC strings.** Weeks are always Monday-based and never shift
  under a timezone or DST change.
- **Chart colours were validated**, not eyeballed — the metric palette clears
  colourblind-separation, contrast and normal-vision gates on a dark surface.
  The order matters: yellow must never sit next to orange. Re-run the validator
  before reordering `WEEK_METRICS` in `src/lib/types.ts`.
- **Numbers wear text colours, never series colours** — the accent lives on a
  small mark beside the label so contrast stays full.
