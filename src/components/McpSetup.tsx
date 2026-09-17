"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, Field, Input } from "./ui";

const DEFAULT_PATH = "C:/Users/User/sales-crm/mcp/index.js";

/**
 * Renders the MCP client config for this CRM, ready to copy.
 *
 * The Supabase URL and anon key are already public in this bundle, so showing
 * them costs nothing. The password is NOT rendered — it is never stored in the
 * app and the user fills it in themselves after pasting.
 */
export function McpSetup() {
  const { session } = useStore();
  const [path, setPath] = useState(DEFAULT_PATH);
  const [copied, setCopied] = useState<string | null>(null);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const email = session?.user?.email ?? "you@example.com";

  const config = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            "sales-crm": {
              command: "node",
              args: [path.replace(/\\/g, "/")],
              env: {
                SUPABASE_URL: url,
                SUPABASE_ANON_KEY: anon,
                CRM_EMAIL: email,
                CRM_PASSWORD: "PUT-YOUR-CRM-PASSWORD-HERE",
              },
            },
          },
        },
        null,
        2
      ),
    [path, url, anon, email]
  );

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

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Connect to Claude
          </h2>
          <p className="text-ink-400 text-base mt-1">
            Let Claude create accounts, contacts and deals, and log your weeks, just by asking.
          </p>
        </div>
        <Button
          variant="primary" size="lg"
          onClick={() => copy(config, "config")}
        >
          {copied === "config" ? "Copied ✓" : copied === "failed" ? "Copy failed" : "⧉ Copy config"}
        </Button>
      </div>

      {/* what you can say */}
      <div className="rounded-xl bg-ink-800/50 p-5 mb-6">
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

      <div className="space-y-6">
        <Field
          label="Path to the MCP server on your computer"
          hint="The mcp/index.js file inside wherever you cloned this project. Use forward slashes."
        >
          <Input value={path} onChange={(e) => setPath(e.target.value)} spellCheck={false} />
        </Field>

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-sm font-semibold text-ink-300 uppercase tracking-wide">
              Your config
            </span>
            <button
              onClick={() => copy(config, "config2")}
              className="focus-ring rounded-lg text-sm font-bold text-brand-bright hover:underline"
            >
              {copied === "config2" ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre className="rounded-xl bg-ink-950/80 border-2 border-ink-700 p-5 overflow-x-auto
                          text-sm leading-relaxed text-ink-200">
            <code>{config}</code>
          </pre>
          <p className="text-sm text-amber-300/90 mt-2.5">
            ⚠️ Replace <b>PUT-YOUR-CRM-PASSWORD-HERE</b> with the password you sign in with.
            It is never stored in this app, so it can&apos;t be filled in for you.
          </p>
        </div>

        {/* where to paste it */}
        <div className="grid sm:grid-cols-2 gap-5">
          <Where
            title="Claude Code (terminal)"
            steps={[
              "Open a terminal",
              "Run:  claude mcp add",
              "…or paste into  ~/.claude.json  under \"mcpServers\"",
              "Restart Claude Code",
            ]}
          />
          <Where
            title="Claude Desktop app"
            steps={[
              "Settings → Developer → Edit Config",
              "Paste inside the \"mcpServers\" block",
              "Save the file",
              "Quit and reopen Claude Desktop",
            ]}
          />
        </div>

        <details className="rounded-xl border-2 border-ink-700 p-5">
          <summary className="cursor-pointer text-lg font-bold text-ink-200 focus-ring rounded-lg">
            First time? Install the server dependencies
          </summary>
          <p className="text-ink-400 mt-3 mb-3">
            Run this once, in the project folder:
          </p>
          <div className="flex items-center gap-3">
            <code className="grow rounded-xl bg-ink-950/80 border-2 border-ink-700 px-4 py-3
                             text-base text-ink-200 overflow-x-auto">
              cd mcp &amp;&amp; npm install
            </code>
            <Button size="md" onClick={() => copy("cd mcp && npm install", "install")}>
              {copied === "install" ? "✓" : "⧉"}
            </Button>
          </div>
          <p className="text-ink-400 mt-4">
            To check it works before wiring it up, run{" "}
            <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright">npm run check</code>{" "}
            in that same folder. It prints a live snapshot of this CRM, or tells you
            exactly which credential is wrong.
          </p>
        </details>

        <p className="text-sm text-ink-500 leading-relaxed">
          🔒 The server signs in as you with your own email and password, so it goes
          through the same row-level security as this website and can only ever reach
          your own data. It never uses a master key.
        </p>
      </div>
    </Card>
  );
}

function Where({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-xl bg-ink-800/50 p-5">
      <div className="text-base font-bold text-ink-100 mb-3">{title}</div>
      <ol className="space-y-2 text-base text-ink-300 list-decimal pl-5 marker:text-brand-bright marker:font-bold">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
