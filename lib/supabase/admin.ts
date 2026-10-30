import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./connection.mjs";

export function createAdminClient() {
  const { url } = getSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret || !secret.startsWith("sb_secret_")) {
    throw new Error("Admin konfiguracija: postavite SUPABASE_SECRET_KEY u serversko okruženje.");
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) }),
    },
  });
}
