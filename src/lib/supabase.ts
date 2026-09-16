"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when .env.local has been filled in. Lets the UI explain itself instead of crashing. */
export const isConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT-REF"));

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and fill in your project URL and anon key."
    );
  }
  if (!_client) {
    _client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _client;
}
