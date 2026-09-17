"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Card } from "./ui";

/**
 * Shows the claude.ai connector URL.
 *
 * The URL is fetched from /api/mcp-link rather than rendered at build time,
 * because it contains MCP_SECRET and anything inlined into the page ships to
 * every visitor, signed in or not.
 */
export function McpSetup() {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) return setErr("Sign in to see your connector link.");
        const res = await fetch("/api/mcp-link", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        setUrl(body.url);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  async function copy(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied((c) => (c === tag ? null : c)), 2000);
    } catch {
      setCopied("failed");
      setTimeout(() => setCopied(null), 2500);
    }
  }

  const masked = url ? url.replace(/\/api\/mcp\/.*/, "/api/mcp/••••••••••••••••") : "";

  return (
    <Card className="p-6 sm:p-7">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Connect to Claude</h2>
      <p className="text-ink-400 text-base mt-1 mb-6">
        Then you can just tell Claude to add contacts, move deals and log your weeks.
      </p>

      <ol className="space-y-5">
        <Step n={1}>
          In Claude, open <b className="text-ink-100">Settings</b> then{" "}
          <b className="text-ink-100">Connectors</b>, and click{" "}
          <b className="text-ink-100">Add custom connector</b>.
        </Step>

        <Step n={2}>
          <div className="mb-2">
            Put <b className="text-ink-100">Oxana</b> in the <b className="text-ink-100">Name</b> box.
          </div>
          <div className="flex items-center gap-3">
            <code className="grow rounded-xl bg-ink-950/80 border-2 border-ink-700 px-4 py-3
                             text-lg font-bold text-ink-100">
              Oxana
            </code>
            <Button size="md" onClick={() => copy("Oxana", "name")}>
              {copied === "name" ? "✓" : "Copy"}
            </Button>
          </div>
        </Step>

        <Step n={3}>
          <div className="mb-2">
            Paste this into the <b className="text-ink-100">MCP server URL</b> box, then click{" "}
            <b className="text-ink-100">Continue</b>.
          </div>

          {err ? (
            <p className="rounded-xl bg-red-500/15 text-red-200 px-4 py-3 text-base font-medium">
              {err}
            </p>
          ) : !url ? (
            <div className="shimmer h-14 rounded-xl" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <code
                  className="grow min-w-0 rounded-xl bg-ink-950/80 border-2 border-ink-700 px-4 py-3
                             text-sm text-ink-200 overflow-x-auto whitespace-nowrap"
                >
                  {revealed ? url : masked}
                </code>
                <Button size="md" onClick={() => setRevealed((v) => !v)}>
                  {revealed ? "Hide" : "Show"}
                </Button>
                <Button size="md" variant="primary" onClick={() => copy(url, "url")}>
                  {copied === "url" ? "Copied ✓" : copied === "failed" ? "Failed" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-amber-300/90 mt-2.5">
                ⚠️ Treat this link like a password. Anyone who has it can read and change
                everything in your CRM. Do not put it in screenshots or messages.
              </p>
            </>
          )}
        </Step>
      </ol>

      <div className="rounded-xl bg-ink-800/50 p-5 mt-7">
        <div className="text-sm font-bold uppercase tracking-wider text-ink-400 mb-3">
          Things you can then say
        </div>
        <ul className="space-y-2 text-lg text-ink-200">
          <li>“Add Dana Okafor, Head of Ops at Acme, and book a follow-up Tuesday.”</li>
          <li>“I did 220 dials, 47 connects and booked 9 meetings this week.”</li>
          <li>“Move the Acme deal to Proposal and set it at 12k.”</li>
          <li>“What was my connect rate last month?”</li>
        </ul>
      </div>

      <p className="text-sm text-ink-500 leading-relaxed mt-5">
        🔒 The connector signs in as you, so it runs under the same security as this
        website and can only reach your own data. It never uses a master key.
      </p>
    </Card>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="h-9 w-9 shrink-0 rounded-xl bg-brand/20 border-2 border-brand/40
                       flex items-center justify-center text-base font-bold text-brand-bright">
        {n}
      </span>
      <div className="grow min-w-0 text-lg text-ink-300 pt-1">{children}</div>
    </li>
  );
}
