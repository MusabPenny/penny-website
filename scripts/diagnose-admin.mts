import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { managementQuery } from "../lib/admin/migrations";
import { checkedUuid } from "../lib/admin/policy";

nextEnv.loadEnvConfig(process.cwd(), true);
try {
  const tenant = checkedUuid(process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID);
  const initial = checkedUuid(process.env.INITIAL_SUPERADMIN_OBJECT_ID);
  const email = process.argv[2] || "";
  const rows = await managementQuery(
    `SELECT tenant_id,object_id,status,(object_id=$2::uuid) AS initial_identity,
      ARRAY(SELECT r.name FROM public.roles r JOIN public.user_roles ur ON ur.role_id=r.id WHERE ur.user_id=u.id) AS roles
     FROM public.app_users u WHERE u.tenant_id=$1::uuid AND (u.object_id=$2::uuid OR lower(u.email)=lower($3))`,
    true,
    [tenant, initial, email],
  );
  console.log("Matching account count:", rows.length);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) }),
      },
    },
  );
  for (const row of rows) {
    console.log(
      "Account state:",
      JSON.stringify({
        status: row.status,
        initialIdentity: row.initial_identity,
        roles: row.roles,
      }),
    );
    for (const action of ["user", "counts", "roles", "audit", "users"]) {
      const start = Date.now();
      const response = await client.rpc("penny_admin_execute", {
        p_tenant_id: tenant,
        p_object_id: row.object_id,
        p_action: action,
        p_payload: {},
      });
      console.log(
        JSON.stringify({
          action,
          status: response.status,
          code: response.error?.code || null,
          elapsedMs: Date.now() - start,
          resultKind: Array.isArray(response.data) ? "array" : typeof response.data,
          permissionDenied: response.error?.message === "FORBIDDEN",
        }),
      );
    }
  }
} catch {
  console.error("Dijagnostika nije uspjela; provjerite konfiguraciju i pristup bez ispisa tajni.");
  process.exitCode = 1;
}
