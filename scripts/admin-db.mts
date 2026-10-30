import nextEnv from "@next/env";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { buildMigrationSql, managementQuery } from "../lib/admin/migrations";
import { checkedUuid } from "../lib/admin/policy";

nextEnv.loadEnvConfig(process.cwd());
try {
  const mode = process.argv[2] || "plan";
  const apply = process.argv.includes("--apply");
  const names = (await readdir("db/migrations")).filter((file) => file.endsWith(".sql")).sort();
  const migrations = await Promise.all(
    names.map(async (name) => ({ name, sql: await readFile(`db/migrations/${name}`, "utf8") })),
  );
  if (mode === "plan" || ((mode === "migrate" || mode === "seed") && !apply)) {
    console.log("Plan: " + names.join(", "));
    console.log(
      "Baza nije izmijenjena. Primjena zahtijeva --apply i prethodno odobrenje vlasnika.",
    );
  } else if (mode === "export") {
    await writeFile("db/admin-migration.sql", buildMigrationSql(migrations) + "\n");
    console.log("SQL za Supabase SQL Editor: db/admin-migration.sql. Baza nije izmijenjena.");
  } else if (mode === "inspect") {
    const rows = await managementQuery(
      "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('app_users','roles','permissions','user_roles','role_permissions','audit_logs','penny_admin_migrations') ORDER BY table_name,ordinal_position",
    );
    console.log(JSON.stringify(rows, null, 2));
  } else if (mode === "migrate") {
    await managementQuery(buildMigrationSql(migrations), false);
    const versions = await managementQuery(
      "SELECT name,checksum,applied_at FROM public.penny_admin_migrations ORDER BY name",
    );
    if (
      versions.length !== migrations.length ||
      !names.every((name) => versions.some((version) => version.name === name))
    )
      throw new Error("Migracije nisu potvrđene. Provjerite stanje baze.");
    console.log("Migracije su primijenjene i potvrđene: " + versions.map((v) => v.name).join(", "));
  } else if (mode === "status") {
    console.log(
      JSON.stringify(
        await managementQuery(
          "SELECT name,checksum,applied_at FROM public.penny_admin_migrations ORDER BY name",
        ),
        null,
        2,
      ),
    );
  } else if (mode === "seed") {
    const tenantId = checkedUuid(process.env.INITIAL_SUPERADMIN_TENANT_ID);
    const objectId = checkedUuid(process.env.INITIAL_SUPERADMIN_OBJECT_ID);
    if (tenantId !== checkedUuid(process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID))
      throw new Error("Tenant inicijalnog superadministratora ne odgovara konfiguraciji.");
    await managementQuery("SELECT penny_admin.bootstrap($1::uuid,$2::uuid)", false, [
      tenantId,
      objectId,
    ]);
    console.log("Inicijalni superadministrator je odobren. Entra Portal.Access ostaje obavezan.");
  } else throw new Error("Nepoznata administrativna komanda.");
} catch (error) {
  const allowed = /^(Nedostaje|Supabase Management API: HTTP \d+\.|Migracije|Tenant|Nepoznata)/;
  console.error(
    error instanceof Error && allowed.test(error.message)
      ? error.message
      : "Administrativna skripta nije uspjela. Provjerite SQL, konfiguraciju i dozvole; tajni podaci nisu ispisani.",
  );
  process.exitCode = 1;
}
