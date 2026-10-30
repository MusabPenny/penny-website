import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase: postavite NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY u .env.",
    );
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Supabase: NEXT_PUBLIC_SUPABASE_URL mora biti ispravan URL.");
  }

  if (
    !["https:", "http:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error("Supabase: koristite osnovni HTTP(S) URL projekta bez putanje.");
  }

  return { url: parsed.origin, key };
}

// A fresh, anonymous client per call; no user sessions shared between requests.
export function createDatabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
