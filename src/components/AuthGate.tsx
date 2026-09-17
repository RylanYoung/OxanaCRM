"use client";

import { useEffect, useState } from "react";
import { supabase, isConfigured, getRemember, setRemember } from "@/lib/supabase";
import { Button, Card, Field, Input } from "./ui";
import { Logo } from "./Logo";

/**
 * Sign-in.
 *
 * Email + password, and signup is instant — Supabase is set to auto-confirm,
 * so no confirmation email is sent and there is nothing to click.
 *
 * There is deliberately no "enter the 6-digit code" flow: a code requires the
 * magic-link email template to carry {{ .Token }}, and template editing is
 * blocked on Supabase's free tier while using their built-in email provider.
 * Wiring custom SMTP would unlock it. Until then a code UI could never
 * receive a code, so we don't pretend to offer one.
 *
 * "Email me a sign-in link" is kept as the password-recovery path. It works
 * because Site URL now points at the deployed app rather than localhost.
 */
export function AuthGate() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRememberState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => setRememberState(getRemember()), []);

  /** Must be set before signing in — it decides where the token is stored. */
  function applyRemember(on: boolean) {
    setRememberState(on);
    setRemember(on);
  }

  function explain(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    if (/Invalid login credentials/i.test(raw))
      return "That email and password don't match. If you've not signed up yet, tap “Create one”.";
    if (/User already registered/i.test(raw))
      return "You already have an account — switching you to sign in.";
    if (/Password should be/i.test(raw))
      return "Password needs to be at least 6 characters.";
    return raw;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const sb = supabase();
      if (mode === "up") {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          if (/User already registered/i.test(error.message)) {
            setMode("in");
            setMsg({ text: "You already have an account — just sign in below.", ok: true });
            return;
          }
          throw error;
        }
        // With auto-confirm on, a session comes straight back and the store
        // picks it up. If the project is ever switched back to requiring
        // confirmation, say so rather than hanging on a blank screen.
        if (!data.session) {
          setMsg({
            text: "Account created. Check your email to confirm, then sign in.",
            ok: true,
          });
          setMode("in");
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setMsg({ text: explain(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function emailLink() {
    if (!email.trim()) {
      setMsg({ text: "Type your email above first.", ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setMsg({
        text: `Sent. Open the email on this device and tap the link — it'll sign you straight in.`,
        ok: true,
      });
    } catch (err) {
      setMsg({ text: explain(err), ok: false });
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------- not wired up to Supabase yet */
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-9 rise">
          <h1 className="text-3xl font-extrabold mb-3">Almost there 👋</h1>
          <p className="text-ink-300 text-lg">
            The app is built — it just needs{" "}
            <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            set in the environment.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rise">
        <div className="flex flex-col items-center mb-9">
          <Logo size={44} />
          <p className="text-ink-400 mt-4 text-lg">Call &amp; Deal Tracker</p>
        </div>

        <Card className="p-8">
          {/* segmented switch */}
          <div className="flex gap-2 p-1.5 rounded-2xl bg-ink-900/70 border-2 border-ink-700 mb-7">
            {([["in", "Sign in"], ["up", "Create account"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setMsg(null); }}
                className={`focus-ring flex-1 h-12 rounded-xl text-base font-bold transition-colors
                  ${mode === m
                    ? "bg-brand text-white shadow-lg shadow-brand/25"
                    : "text-ink-400 hover:text-ink-100"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Field label="Email">
              <Input
                type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
              />
            </Field>

            <Field
              label="Password"
              hint={mode === "up" ? "At least 6 characters. No confirmation email — you're in straight away." : undefined}
            >
              <Input
                type="password" required minLength={6}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <button
              type="button"
              onClick={() => applyRemember(!remember)}
              className="focus-ring w-full flex items-center gap-4 rounded-xl px-4 py-4
                         bg-ink-800/60 border-2 border-ink-700 hover:border-ink-500
                         transition-colors text-left"
            >
              <span
                className={`h-8 w-8 shrink-0 rounded-lg border-2 flex items-center justify-center
                  text-lg font-bold transition-colors
                  ${remember ? "bg-emerald-500 border-emerald-400 text-white" : "border-ink-500"}`}
              >
                {remember ? "✓" : ""}
              </span>
              <span>
                <span className="block text-lg font-bold">Stay signed in on this device</span>
                <span className="block text-sm text-ink-400 mt-0.5">
                  {remember
                    ? "You won't be asked to log in again on this device."
                    : "You'll be signed out when you close the browser."}
                </span>
              </span>
            </button>

            {msg && (
              <p className={`text-base font-medium rounded-xl px-4 py-3 ${
                msg.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
                {msg.text}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? "One sec…" : mode === "in" ? "Sign in" : "Create account & go"}
            </Button>
          </form>

          <div className="mt-7 pt-6 border-t border-ink-700 text-center">
            <button
              type="button"
              disabled={busy}
              onClick={emailLink}
              className="focus-ring rounded-lg text-ink-400 hover:text-ink-100 text-base
                         font-semibold transition-colors disabled:opacity-40"
            >
              Forgot your password? Email me a sign-in link
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
