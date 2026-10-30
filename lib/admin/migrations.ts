import { createHash } from "node:crypto";

export type Migration = { name: string; sql: string };
export function migrationChecksum(sql: string) {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}
export function buildMigrationSql(migrations: Migration[]) {
  const pieces = [
    "BEGIN; SELECT pg_advisory_xact_lock(20261020,1);",
    "CREATE TABLE IF NOT EXISTS public.penny_admin_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());",
    "ALTER TABLE public.penny_admin_migrations ENABLE ROW LEVEL SECURITY;",
    "REVOKE ALL ON public.penny_admin_migrations FROM PUBLIC,anon,authenticated,service_role;",
  ];
  for (const { name, sql } of migrations) {
    if (!/^\d+_[a-z0-9_]+\.sql$/.test(name)) throw new Error("Neispravan naziv migracije.");
    const checksum = migrationChecksum(sql);
    const delimiter = `$source_${checksum}$`;
    if (sql.includes(delimiter)) throw new Error("Neispravan SQL delimiter.");
    pieces.push(`DO $apply_${checksum}$ DECLARE previous text; BEGIN
      SELECT checksum INTO previous FROM public.penny_admin_migrations WHERE name='${name}';
      IF previous IS NULL THEN
        EXECUTE ${delimiter}${sql.replace(/\r\n/g, "\n")}${delimiter};
        INSERT INTO public.penny_admin_migrations(name,checksum) VALUES('${name}','${checksum}');
      ELSIF previous <> '${checksum}' THEN
        RAISE EXCEPTION 'Checksum mismatch: ${name}';
      END IF;
    END; $apply_${checksum}$;`);
  }
  pieces.push("NOTIFY pgrst, 'reload schema'; COMMIT;");
  return pieces.join("\n\n");
}

export function managementEnvironment() {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token)
    throw new Error(
      "Nedostaje SUPABASE_ACCESS_TOKEN za migracije (Supabase Personal Access Token).",
    );
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
  const match = /^([a-z0-9]+)\.supabase\.co$/.exec(host);
  if (!match) throw new Error("Migracije zahtijevaju standardni Supabase project URL.");
  return { token, projectRef: match[1] };
}

export async function managementQuery(
  query: string,
  readOnly = true,
  parameters: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  const { token, projectRef } = managementEnvironment();
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: readOnly, parameters }),
      signal: AbortSignal.timeout(45000),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    // Do not log server response bodies: they may include SQL or parameters.
    throw new Error(`Supabase Management API: HTTP ${response.status}.`);
  }
  const data: unknown = await response.json();
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "result" in data && Array.isArray(data.result))
    return data.result;
  // DDL statements may return an empty object rather than rows.
  return [];
}
