"use client";

import { useState } from "react";
import { supabase, isConfigured } from "@/lib/supabase";
import { Button, Card, Field, Input } from "./ui";

export function AuthGate() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const sb = supabase();
      if (mode === "up") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMsg({ text: "Check your email to confirm, then sign in.", ok: true });
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : String(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  /* --------------------------------------------- not wired up to Supabase yet */
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-9 rise">
          <h1 className="text-3xl font-extrabold mb-3">Almost there 👋</h1>
          <p className="text-ink-300 text-lg mb-7">
            The app is built — it just needs your Supabase keys.
          </p>
          <ol className="space-y-4 text-ink-200 text-lg list-decimal pl-6 marker:text-brand-bright marker:font-bold">
            <li>
              In Supabase open <b>SQL Editor → New query</b>, paste all of{" "}
              <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright text-base">
                supabase/schema.sql
              </code>{" "}
              and hit <b>Run</b>.
            </li>
            <li>
              Go to <b>Project Settings → API Keys</b> and copy the{" "}
              <b>Project URL</b> and the <b>anon / public</b> key.
            </li>
            <li>
              In the project folder copy{" "}
              <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright text-base">
                .env.example
              </code>{" "}
              to{" "}
              <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright text-base">
                .env.local
              </code>{" "}
              and paste both values in.
            </li>
            <li>
              Restart the dev server (<code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright text-base">npm run dev</code>).
            </li>
          </ol>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------ sign in / up */
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rise">
        <div className="flex flex-col items-center mb-9">
          <span className="h-16 w-16 rounded-3xl bg-gradient-to-br from-brand-bright to-brand
                           flex items-center justify-center text-3xl mb-4">
            ⚡
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">Sales CRM</h1>
          <p className="text-ink-400 mt-2 text-lg">Your numbers, your pipeline, one place.</p>
        </div>

        <Card className="p-8">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Email">
              <Input
                type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              />
            </Field>
            <Field label="Password" hint={mode === "up" ? "At least 6 characters." : undefined}>
              <Input
                type="password" required minLength={6}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {msg && (
              <p className={`text-base font-medium rounded-xl px-4 py-3 ${
                msg.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                {msg.text}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? "One sec…" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}
            className="focus-ring rounded-lg mt-6 w-full text-center text-ink-400 hover:text-ink-100
                       text-base font-medium transition-colors"
          >
            {mode === "in"
              ? "First time here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </Card>
      </div>
    </div>
  );
}
