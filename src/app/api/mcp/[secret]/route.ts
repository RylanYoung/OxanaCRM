import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TOOLS, callTool } from "@/lib/crm-tools";

/**
 * Hosted MCP endpoint (Streamable HTTP), so claude.ai's "Add custom connector"
 * can reach the CRM. The stdio server in /mcp stays for Claude Code.
 *
 * Auth is a shared secret in the path. claude.ai's connector dialog accepts a
 * URL and nothing else, so there is no header to put a bearer token in. The
 * secret is long and random, but anyone holding the URL has full access to the
 * CRM, so it must be treated as a password and never pasted in public.
 *
 * The Supabase client signs in as the CRM owner with their normal email and
 * password, so every query still runs under row-level security. No
 * service-role key is used or stored.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const result = (id: Rpc["id"], r: unknown) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id, result: r }), { headers: JSON_HEADERS });

const rpcError = (id: Rpc["id"], code: number, message: string) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { headers: JSON_HEADERS });

/* --------------------------------------------------------- supabase session */

let cached: { sb: SupabaseClient; userId: string; at: number } | null = null;
const SESSION_TTL = 30 * 60_000;

async function crmClient(): Promise<{ sb: SupabaseClient; userId: string }> {
  if (cached && Date.now() - cached.at < SESSION_TTL) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.CRM_EMAIL;
  const password = process.env.CRM_PASSWORD;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anon && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !email && "CRM_EMAIL",
    !password && "CRM_PASSWORD",
  ].filter(Boolean);
  if (missing.length) throw new Error(`Server is missing env var(s): ${missing.join(", ")}`);

  const sb = createClient(url!, anon!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email: email!, password: password! });
  if (error) throw new Error(`Could not sign in to the CRM: ${error.message}`);

  cached = { sb, userId: data.user.id, at: Date.now() };
  return cached;
}

/* ----------------------------------------------------------------- routes */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  const expected = process.env.MCP_SECRET;

  if (!expected) return rpcError(null, -32000, "Server has no MCP_SECRET configured.");
  if (secret !== expected) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: JSON_HEADERS });
  }

  let body: Rpc;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id = null, method, params: p = {} } = body;

  // Notifications carry no id and expect no body back.
  if (method?.startsWith("notifications/")) return new Response(null, { status: 202 });

  try {
    switch (method) {
      case "initialize": {
        const asked = (p as { protocolVersion?: string }).protocolVersion;
        return result(id, {
          // Echo the client's version when it offers one; it knows what it speaks.
          protocolVersion: asked ?? "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "oxana-crm", version: "1.0.0" },
        });
      }

      case "ping":
        return result(id, {});

      case "tools/list":
        return result(id, { tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args = {} } = p as { name: string; arguments?: Record<string, never> };
        try {
          const { sb, userId } = await crmClient();
          const out = await callTool(sb, userId, name, args);
          return result(id, {
            content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
          });
        } catch (e) {
          // Tool failures are results, not protocol errors: the model should see
          // the message and be able to correct itself.
          return result(id, {
            content: [{ type: "text", text: `ERROR: ${e instanceof Error ? e.message : String(e)}` }],
            isError: true,
          });
        }
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    return rpcError(id, -32603, e instanceof Error ? e.message : String(e));
  }
}

/** Clients may probe with GET for a server-initiated SSE stream; we have none. */
export async function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
    },
  });
}
