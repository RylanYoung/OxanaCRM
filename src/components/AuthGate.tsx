"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, isConfigured, getRemember, setRemember } from "@/lib/supabase";
import { Button, Card, Field, Input } from "./ui";

type Step = "email" | "code" | "password";

const CODE_LEN = 6;

export function AuthGate() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRememberState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => setRememberState(getRemember()), []);

  // Resend cooldown so we don't spam Supabase's rate limit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function fail(e: unknown) {
    setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
  }

  /** Persist the choice before signing in — it decides where the token is stored. */
  function applyRemember(on: boolean) {
    setRememberState(on);
    setRemember(on);
  }

  async function sendCode(resend = false) {
    if (!email.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep("code");
      setCode("");
      setCooldown(30);
      setMsg({
        text: resend ? "New code sent." : `We emailed a ${CODE_LEN}-digit code to ${email.trim()}.`,
        ok: true,
      });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase().auth.verifyOtp({
        email: email.trim(),
        token: value,
        type: "email",
      });
      if (error) throw error;
      // The store's onAuthStateChange takes it from here.
    } catch (e) {
      fail(e);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (e) {
      fail(e);
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
          <p className="text-ink-300 text-lg mb-6">
            The app is built — it just needs your Supabase keys in the environment
            (<code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="px-2 py-0.5 rounded-lg bg-ink-800 text-brand-bright">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>).
          </p>
        </Card>
      </div>
    );
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
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
        <Card className="p-8">{children}</Card>
      </div>
    </div>
  );

  const Note = () =>
    msg ? (
      <p className={`text-base font-medium rounded-xl px-4 py-3 ${
        msg.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>
        {msg.text}
      </p>
    ) : null;

  const RememberToggle = () => (
    <button
      type="button"
      onClick={() => applyRemember(!remember)}
      className="focus-ring w-full flex items-center gap-4 rounded-xl px-4 py-4
                 bg-ink-800/60 border-2 border-ink-700 hover:border-ink-500 transition-colors text-left"
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
  );

  /* ------------------------------------------------------------ enter code */
  if (step === "code") {
    return (
      <Shell>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-ink-400 mt-1.5 text-base">
              Enter the {CODE_LEN}-digit code we sent to{" "}
              <b className="text-ink-200">{email.trim()}</b>
            </p>
          </div>

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={busy}
          />

          <Note />

          <Button
            variant="primary" size="lg" className="w-full"
            disabled={busy || code.length < CODE_LEN}
            onClick={() => verify(code)}
          >
            {busy ? "Checking…" : "Verify & sign in"}
          </Button>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { setStep("email"); setMsg(null); setCode(""); }}
              className="focus-ring rounded-lg text-ink-400 hover:text-ink-100 text-base font-semibold"
            >
              ← Change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => sendCode(true)}
              className="focus-ring rounded-lg text-ink-400 hover:text-ink-100 text-base
                         font-semibold disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* -------------------------------------------------------- password login */
  if (step === "password") {
    return (
      <Shell>
        <form onSubmit={passwordSubmit} className="space-y-5">
          <Field label="Email">
            <Input type="email" required autoComplete="email" value={email}
                   onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Password">
            <Input type="password" required autoComplete="current-password" value={password}
                   onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>

          <RememberToggle />
          <Note />

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "One sec…" : "Sign in"}
          </Button>

          <button
            type="button"
            onClick={() => { setStep("email"); setMsg(null); }}
            className="focus-ring rounded-lg w-full text-center text-ink-400 hover:text-ink-100
                       text-base font-medium transition-colors"
          >
            ← Email me a code instead
          </button>
        </form>
      </Shell>
    );
  }

  /* ------------------------------------------------------------ enter email */
  return (
    <Shell>
      <form
        onSubmit={(e) => { e.preventDefault(); sendCode(); }}
        className="space-y-5"
      >
        <Field label="Email" hint="No password needed — we'll email you a code.">
          <Input
            type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
          />
        </Field>

        <RememberToggle />
        <Note />

        <Button type="submit" variant="primary" size="lg" className="w-full"
                disabled={busy || !email.trim()}>
          {busy ? "Sending…" : "Email me a code →"}
        </Button>

        <button
          type="button"
          onClick={() => { setStep("password"); setMsg(null); }}
          className="focus-ring rounded-lg w-full text-center text-ink-400 hover:text-ink-100
                     text-base font-medium transition-colors"
        >
          Use a password instead
        </button>
      </form>
    </Shell>
  );
}

/* ------------------------------------------------------------- CodeInput */

/** Six big boxes: auto-advance, backspace, arrow keys and paste all work. */
function CodeInput({
  value, onChange, onComplete, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  function put(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // Pasting the whole code into any box fills them all.
    const next = (value.slice(0, i) + digits).slice(0, CODE_LEN).padEnd(0, "");
    onChange(next);

    const landed = Math.min(next.length, CODE_LEN - 1);
    refs.current[landed]?.focus();
    if (next.length === CODE_LEN) onComplete(next);
  }

  function key(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) onChange(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) { onChange(value.slice(0, i - 1)); refs.current[i - 1]?.focus(); }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < CODE_LEN - 1) refs.current[i + 1]?.focus();
  }

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length: CODE_LEN }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          onChange={(e) => put(i, e.target.value)}
          onKeyDown={(e) => key(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LEN}
          aria-label={`Digit ${i + 1}`}
          className={`tnum w-full h-16 rounded-xl bg-ink-900/80 border-2 text-center
            text-3xl font-extrabold focus-ring transition-colors
            ${value[i] ? "border-brand-bright text-ink-100" : "border-ink-700 text-ink-400"}
            disabled:opacity-50`}
        />
      ))}
    </div>
  );
}
