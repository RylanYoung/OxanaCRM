import { createClient } from "@supabase/supabase-js";

/**
 * Hands the signed-in user their own connector URL.
 *
 * The URL embeds MCP_SECRET, which is full access to the CRM, so it must never
 * be inlined into the page bundle: NEXT_PUBLIC_* values ship to every visitor
 * whether they are logged in or not. Instead the browser sends its Supabase
 * access token here, this route verifies it server-side, and only then returns
 * the secret.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export async function GET(req: Request) {
  const secret = process.env.MCP_SECRET;
  if (!secret) return json({ error: "No MCP_SECRET configured on the server." }, 500);

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not signed in." }, 401);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return json({ error: "Supabase is not configured." }, 500);

  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return json({ error: "Not signed in." }, 401);

  // The connector runs as whoever CRM_EMAIL is, so only that account may see it.
  const owner = process.env.CRM_EMAIL?.toLowerCase();
  if (owner && data.user.email?.toLowerCase() !== owner) {
    return json({ error: "Only the CRM owner can view the connector link." }, 403);
  }

  const origin = new URL(req.url).origin;
  return json({ url: `${origin}/api/mcp/${secret}` });
}
