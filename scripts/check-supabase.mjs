import nextEnv from "@next/env";
import { createDatabaseClient } from "../lib/supabase/connection.mjs";

nextEnv.loadEnvConfig(process.cwd());

try {
  const supabase = createDatabaseClient();
  // Probe without reading rows or requiring an application table to exist.
  // PGRST205 is PostgREST's expected response for a missing relation and proves
  // the gateway accepted our key and reached the database schema cache.
  const { error, status } = await supabase
    .from("__pennyplus_connection_check__")
    .select("*")
    .limit(0)
    .abortSignal(AbortSignal.timeout(15000));

  if (error && !(status === 404 && error.code === "PGRST205")) {
    throw new Error(
      `Supabase: SDK provjera nije uspjela (HTTP ${status}, kod: ${error.code || "nepoznat"}). Provjerite mrežu, ključ i dozvole.`,
    );
  }

  console.log(
    "PASS: Supabase SDK i Data API su povezani; ključ je prihvaćen. Provjera ne čita redove niti mijenja podatke. Dozvole nad stvarnim tabelama provjeravaju se pri njihovoj integraciji.",
  );
} catch (error) {
  // Avoid logging request headers, credentials or database response bodies.
  console.error(
    error instanceof Error && error.message.startsWith("Supabase")
      ? error.message
      : "Supabase provjera nije uspjela. Provjerite mrežu, konfiguraciju i dozvole.",
  );
  process.exitCode = 1;
}
