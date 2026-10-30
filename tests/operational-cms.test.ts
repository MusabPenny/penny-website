import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { buildMigrationSql } from "../lib/admin/migrations";
test("operational CMS migrations: paged search, redirects, directory permissions and queue workspace", async () => {
  const db = new PGlite();
  const tenant = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    owner = "11111111-1111-1111-1111-111111111111",
    marketer = "22222222-2222-2222-2222-222222222222";
  try {
    await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;");
    const names = (await readdir("db/migrations")).filter((name) => name.endsWith(".sql")).sort();
    const sql = buildMigrationSql(
      await Promise.all(
        names.map(async (name) => ({ name, sql: await readFile(`db/migrations/${name}`, "utf8") })),
      ),
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.query("SELECT penny_admin.bootstrap($1::uuid,$2::uuid)", [tenant, owner]);
    await db.query(
      "INSERT INTO public.app_users(tenant_id,object_id,display_name,status) VALUES($1::uuid,$2::uuid,'Marketing','APPROVED')",
      [tenant, marketer],
    );
    await db.exec(
      "INSERT INTO public.user_roles(user_id,role_id) SELECT u.id,r.id FROM public.app_users u CROSS JOIN public.roles r WHERE u.display_name='Marketing' AND r.name='MARKETING'; INSERT INTO public.site_entries(kind,slug,title,body,status) SELECT 'news','test-'||n,'Čista vijest '||n,'Dugi tekst','PUBLISHED' FROM generate_series(1,23) n; INSERT INTO public.newsletter_subscribers(email) SELECT 'test'||n||'@example.invalid' FROM generate_series(1,520) n; SET ROLE service_role;",
    );
    const rpc = async (name: string, payload: unknown, actor = owner) =>
      (
        await db.query<{ result: Record<string, unknown> }>(
          `SELECT public.${name}($1::uuid,$2::uuid,$3::jsonb) result`,
          [tenant, actor, JSON.stringify(payload)],
        )
      ).rows[0].result;
    const list = await rpc("penny_browse_entries", { kind: "news", query: "cista", page: 2 });
    assert.equal(list.total, 23);
    assert.equal((list.entries as unknown[]).length, 10);
    assert.equal((list.entries as { body: string }[])[0].body, "");
    const second = await rpc("penny_browse_subscribers", { page: 35 });
    assert.equal(second.total, 520);
    assert.equal((second.entries as unknown[]).length, 10);
    const searched = await rpc("penny_browse_subscribers", { query: "test519@" });
    assert.equal(searched.total, 1);
    const directories = (
      await db.query<{ result: unknown[] }>(
        "SELECT public.penny_directory_public('location') result",
      )
    ).rows[0].result;
    assert.equal(directories.length, 13);
    await assert.rejects(
      db.query(
        "SELECT public.penny_directory_admin($1::uuid,$2::uuid,'list','{\"kind\":\"member\"}')",
        [tenant, marketer],
      ),
      /FORBIDDEN/,
    );
    await db.exec("UPDATE public.site_entries SET slug='promijenjena' WHERE slug='test-1'");
    const alias = (
      await db.query<{ result: { slug: string; body: string }[] }>(
        "SELECT public.penny_read_entries('news','test-1',1,0,false) result",
      )
    ).rows[0].result;
    assert.equal(alias[0].slug, "promijenjena");
    assert.equal(alias[0].body, "Dugi tekst");
    await assert.rejects(
      db.exec(
        "INSERT INTO public.site_entries(kind,slug,title) VALUES('news','test-1','Druga objava')",
      ),
      /SLUG_RESERVED/,
    );
    assert.equal((await rpc("penny_mail_workspace", {})).total, 0);
    await db.exec(
      "INSERT INTO public.candidate_applications(id,kind,job_title,first_name,last_name,email,answers) SELECT gen_random_uuid(),'job','Otvorena prijava','Test','Kandidat','test@example.invalid','{}' FROM generate_series(1,30); INSERT INTO public.recruitment_mail_queue(application_id,audience,status) SELECT id,'hr','failed' FROM public.candidate_applications; INSERT INTO public.recruitment_mail_queue(application_id,audience,status) SELECT id,'candidate','failed' FROM public.candidate_applications;",
    );
    const thirdQueuePage = await rpc("penny_mail_workspace", { page: 3, status: "failed" });
    assert.equal(thirdQueuePage.total, 60);
    assert.equal((thirdQueuePage.queue as unknown[]).length, 10);
    await assert.rejects(rpc("penny_mail_workspace", {}, marketer), /FORBIDDEN/);
    await db.exec("RESET ROLE;SET ROLE anon");
    await assert.rejects(
      db.exec("SELECT public.penny_directory_public('member')"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
