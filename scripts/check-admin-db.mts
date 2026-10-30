import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { managementQuery } from "../lib/admin/migrations";
import { checkedUuid } from "../lib/admin/policy";
import { getSupabaseConfig } from "../lib/supabase/connection.mjs";

nextEnv.loadEnvConfig(process.cwd());
try {
  const tables = await managementQuery(
    "SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('app_users','roles','permissions','user_roles','role_permissions','audit_logs') ORDER BY c.relname",
  );
  assert.equal(tables.length, 6);
  assert.ok(tables.every((table) => table.relrowsecurity === true));
  const [rights] = await managementQuery(`SELECT
    has_function_privilege('service_role','public.penny_admin_execute(uuid,uuid,text,jsonb)','EXECUTE') AS server_rpc,
    has_function_privilege('anon','public.penny_admin_execute(uuid,uuid,text,jsonb)','EXECUTE') AS public_rpc,
    has_function_privilege('authenticated','public.penny_admin_execute(uuid,uuid,text,jsonb)','EXECUTE') AS authenticated_rpc,
    has_function_privilege('service_role','penny_admin.bootstrap(uuid,uuid)','EXECUTE') AS server_bootstrap,
    has_table_privilege('service_role','public.audit_logs','UPDATE') AS audit_update,
    has_table_privilege('service_role','public.audit_logs','DELETE') AS audit_delete,
    (SELECT count(*)::int FROM public.roles WHERE name IN ('SUPER_ADMIN','ADMIN','USER')) AS roles,
    (SELECT count(*)::int FROM public.permissions) AS permissions`);
  assert.equal(rights.server_rpc, true);
  for (const name of [
    "public_rpc",
    "authenticated_rpc",
    "server_bootstrap",
    "audit_update",
    "audit_delete",
  ])
    assert.equal(rights[name], false, name);
  assert.equal(rights.roles, 3);
  assert.ok(Number(rights.permissions) >= 8);
  const { url, key } = getSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  assert.ok(secret);
  assert.ok(secret.startsWith("sb_secret_"));
  const options = {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  };
  const server = createClient(url, secret, options);
  const publicClient = createClient(url, key, options);
  const args = {
    p_tenant_id: checkedUuid(process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID),
    p_object_id: checkedUuid(process.env.INITIAL_SUPERADMIN_OBJECT_ID),
    p_action: "user",
    p_payload: {},
  };
  const user = await server.rpc("penny_admin_execute", args);
  assert.equal(user.error, null);
  for (const table of tables) {
    const result = await publicClient.from(String(table.relname)).select("*").limit(0);
    assert.equal(result.error?.code, "42501");
  }
  const denied = await publicClient.rpc("penny_admin_execute", args);
  assert.equal(denied.error?.code, "42501");
  console.log(
    "PASS: šest tabela, RLS, uloge/dozvole, serverski RPC, blokiran javni pristup i zaštićen audit. Bez izmjena podataka.",
  );
} catch (error) {
  if (error instanceof assert.AssertionError) console.error("Assertion:", error.message);
  console.error(
    "Provjera admin baze nije uspjela. Provjerite konfiguraciju, migracije i privilegije; tajni podaci nisu ispisani.",
  );
  process.exitCode = 1;
}
