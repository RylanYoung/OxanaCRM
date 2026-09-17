"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the env vars are filled in. Lets the UI explain itself instead of crashing. */
export const isConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT-REF"));

const REMEMBER_KEY = "crm.remember-me";

/** Read the "stay signed in" preference. Defaults to true — this is a personal CRM. */
export function getRemember(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * Choose where the session token lives.
 *
 *   remember = true  -> localStorage   : survives closing the browser, stays
 *                                        signed in on this device indefinitely
 *                                        (the refresh token renews itself).
 *   remember = false -> sessionStorage : cleared the moment the tab closes.
 *
 * This must be decided BEFORE the client is constructed, which is why
 * setRemember() tears the cached client down.
 */
function sessionStore(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return getRemember() ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!_client) {
    _client = createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: sessionStore(),
      },
    });
  }
  return _client;
}

/**
 * Set the preference and rebuild the client so the next sign-in writes its
 * token to the right place. Call this BEFORE signing in.
 */
export function setRemember(on: boolean) {
  try {
    window.localStorage.setItem(REMEMBER_KEY, on ? "1" : "0");
  } catch {
    /* private mode — fall through, the default (remember) still applies */
  }
  // Drop any token sitting in the store we're no longer using.
  try {
    (on ? window.sessionStorage : window.localStorage).removeItem(
      `sb-${new URL(url!).hostname.split(".")[0]}-auth-token`
    );
  } catch {
    /* nothing to clean up */
  }
  _client = null;
}
