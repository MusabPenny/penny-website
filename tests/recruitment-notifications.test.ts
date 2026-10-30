import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("notification settings enforce RBAC; application and queue commit together; deadline guard preserves old ads", async () => {
  const db = new PGlite();
  const tenant = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    owner = "11111111-1111-1111-1111-111111111111",
    marketer = "22222222-2222-2222-2222-222222222222";
  try {
    await db.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
    );
    for (const name of [
      "001_admin_rbac.sql",
      "002_supabase_admin_rpc.sql",
      "003_content_recruitment.sql",
      "004_newsletter.sql",
    ])
      await db.exec(await readFile(`db/migrations/${name}`, "utf8"));
    await db.query("SELECT penny_admin.bootstrap($1::uuid,$2::uuid)", [tenant, owner]);
    await db.query(
      "INSERT INTO public.app_users(tenant_id,object_id,display_name,status) VALUES($1::uuid,$2::uuid,'Marketing','APPROVED')",
      [tenant, marketer],
    );
    await db.exec(
      "INSERT INTO public.user_roles(user_id,role_id) SELECT u.id,r.id FROM public.app_users u CROSS JOIN public.roles r WHERE u.display_name='Marketing' AND r.name='MARKETING'; INSERT INTO public.site_entries(kind,slug,title,status) VALUES('job','historijski','Stari oglas','PUBLISHED');",
    );
    await db.exec(await readFile("db/migrations/005_recruitment_notifications.sql", "utf8"));
    assert.equal(
      (await db.query("SELECT id FROM public.site_entries WHERE slug='historijski'")).rows.length,
      1,
    );
    await db.exec("SET ROLE service_role");
    const rpc = (actor: string, action: string, payload = {}) =>
      db.query("SELECT public.penny_recruitment_mail($1::uuid,$2::uuid,$3,$4::jsonb)", [
        tenant,
        actor,
        action,
        JSON.stringify(payload),
      ]);
    await assert.rejects(rpc(marketer, "read"), /FORBIDDEN/);
    await assert.rejects(
      rpc(owner, "save", { enabled: true, sender: "hr@example.invalid", recipients: [] }),
      /INVALID_INPUT/,
    );
    await rpc(owner, "save", {
      enabled: true,
      sender: "hr@example.invalid",
      recipients: ["one@example.invalid", "two@example.invalid"],
      candidate_confirmation: true,
    });
    const payload = {
      id: "33333333-3333-3333-3333-333333333333",
      kind: "job",
      first_name: "Test",
      last_name: "Kandidat",
      email: "candidate@example.invalid",
      answers: {},
      attachments: [],
    };
    await db.query("SELECT public.penny_submit_application($1::jsonb)", [JSON.stringify(payload)]);
    assert.equal((await db.query("SELECT id FROM public.recruitment_mail_queue")).rows.length, 2);
    await assert.rejects(
      db.exec("UPDATE public.site_entries SET title='Izmijenjen oglas' WHERE slug='historijski'"),
      /JOB_DEADLINE_REQUIRED/,
    );
    await db.exec(
      "UPDATE public.site_entries SET status='ARCHIVED' WHERE slug='historijski'; DELETE FROM public.candidate_applications;",
    );
    assert.equal((await db.query("SELECT id FROM public.recruitment_mail_queue")).rows.length, 0);
    await db.exec("RESET ROLE; SET ROLE anon");
    await assert.rejects(
      db.exec("SELECT * FROM public.recruitment_mail_settings"),
      /permission denied/,
    );
    await assert.rejects(rpc(owner, "read"), /permission denied/);
  } finally {
    await db.close();
  }
});
