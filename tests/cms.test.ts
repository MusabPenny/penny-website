import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateApplication, jobSections, internshipSections } from "../lib/application-fields";
import { checkedUpload } from "../lib/uploads";
const tenant = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  owner = "11111111-1111-1111-1111-111111111111",
  marketer = "22222222-2222-2222-2222-222222222222";
let db: PGlite;
async function rpc(action: string, payload: Record<string, unknown>, actor = owner) {
  await db.exec("SET ROLE service_role");
  try {
    return (
      await db.query<{ result: unknown }>(
        "SELECT public.penny_content_execute($1::uuid,$2::uuid,$3,$4::jsonb) result",
        [tenant, actor, action, JSON.stringify(payload)],
      )
    ).rows[0].result;
  } finally {
    await db.exec("RESET ROLE");
  }
}
before(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;",
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
  await db.query(
    "INSERT INTO public.user_roles(user_id,role_id) SELECT u.id,r.id FROM public.app_users u CROSS JOIN public.roles r WHERE u.object_id=$1::uuid AND r.name='MARKETING'",
    [marketer],
  );
});
after(async () => {
  await db?.close();
});
test("marketing publishes content, cannot create jobs or read/update/delete applications", async () => {
  const e = (await rpc(
    "save",
    { kind: "news", slug: "test-vijest", title: "Test vijest", status: "DRAFT", body: "Nacrt" },
    marketer,
  )) as { id: string; updated_at: string };
  await db.exec("SET ROLE service_role");
  const hidden = await db.query<{ data: unknown[] }>(
    "SELECT public.penny_public_entries('news') data",
  );
  await db.exec("RESET ROLE");
  assert.equal(hidden.rows[0].data.length, 0);
  await rpc(
    "save",
    {
      id: e.id,
      version: e.updated_at,
      kind: "news",
      slug: "test-vijest",
      title: "Test vijest",
      status: "PUBLISHED",
      body: "Objavljeno",
    },
    marketer,
  );
  for (const action of ["applications", "application", "application_update", "application_delete"])
    await assert.rejects(rpc(action, { id: e.id }, marketer), /FORBIDDEN/);
  await assert.rejects(rpc("save", { kind: "job", title: "Zabranjeno" }, marketer), /FORBIDDEN/);
  await assert.rejects(
    rpc(
      "save",
      {
        id: e.id,
        kind: "news",
        slug: "test-vijest",
        title: "Stara verzija",
        status: "DRAFT",
        version: e.updated_at,
      },
      marketer,
    ),
    /CONFLICT/,
  );
});
test("public content excludes future/expired offers; anonymous users cannot call RPC or read candidate tables", async () => {
  await rpc("save", {
    kind: "promotion",
    slug: "istekla",
    title: "Istekla akcija",
    status: "PUBLISHED",
    starts_at: "2020-01-01",
    ends_at: "2020-01-02",
  });
  await rpc("save", {
    kind: "promotion",
    slug: "buduca",
    title: "Buduća akcija",
    status: "PUBLISHED",
    starts_at: "2099-01-01",
  });
  await db.exec("SET ROLE service_role");
  const r = await db.query<{ data: unknown[] }>(
    "SELECT public.penny_public_entries('promotion') data",
  );
  await db.exec("RESET ROLE");
  assert.equal(r.rows[0].data.length, 0);
  await db.exec("SET ROLE anon");
  try {
    await assert.rejects(
      db.query("SELECT * FROM public.candidate_applications"),
      /permission denied/,
    );
    await assert.rejects(db.query("SELECT public.penny_public_entries(NULL)"), /permission denied/);
    await assert.rejects(
      db.query("SELECT public.penny_submit_application('{}')"),
      /permission denied/,
    );
  } finally {
    await db.exec("RESET ROLE");
  }
});
test("applications persist privately, reject closed jobs and wrong attachment prefixes; review/delete are audited", async () => {
  const job = (await rpc("save", {
    kind: "job",
    slug: "otvoren-posao",
    title: "Otvoren posao",
    status: "PUBLISHED",
  })) as { id: string; updated_at: string };
  const id = "33333333-3333-3333-3333-333333333333";
  const payload = {
    id,
    kind: "job",
    job_id: job.id,
    first_name: "Test",
    last_name: "Kandidat",
    email: "test@example.invalid",
    answers: { phone: "123" },
    attachments: [],
  };
  await db.exec("SET ROLE service_role");
  try {
    await db.query("SELECT public.penny_submit_application($1::jsonb)", [JSON.stringify(payload)]);
    await assert.rejects(
      db.query("SELECT public.penny_submit_application($1::jsonb)", [
        JSON.stringify({
          ...payload,
          id: "44444444-4444-4444-4444-444444444444",
          attachments: [{ path: "other/cv.pdf" }],
        }),
      ]),
      /INVALID_INPUT/,
    );
  } finally {
    await db.exec("RESET ROLE");
  }
  const rows = (await rpc("applications", {})) as { id: string }[];
  assert.ok(rows.some((r) => r.id === id));
  await rpc("application_update", { id, status: "REVIEWING", notes: "Pozvati kandidata" });
  const current = (await rpc("application", { id })) as { status: string; notes: string };
  assert.equal(current.status, "REVIEWING");
  assert.equal(current.notes, "Pozvati kandidata");
  await rpc("archive", { id: job.id, kind: "job", version: job.updated_at });
  await db.exec("SET ROLE service_role");
  try {
    await assert.rejects(
      db.query("SELECT public.penny_submit_application($1::jsonb)", [
        JSON.stringify({ ...payload, id: "55555555-5555-5555-5555-555555555555" }),
      ]),
      /JOB_CLOSED/,
    );
  } finally {
    await db.exec("RESET ROLE");
  }
  await rpc("application_delete", { id });
  assert.equal((await db.query("SELECT * FROM public.candidate_applications")).rows.length, 0);
  assert.ok(
    (await db.query("SELECT * FROM public.audit_logs WHERE action='APPLICATION_DELETE'")).rows
      .length,
  );
});
test("distributed form limit rejects the sixth attempt", async () => {
  await db.exec("SET ROLE service_role");
  try {
    for (let i = 0; i < 5; i++)
      await db.query("SELECT public.penny_form_reserve($1)", ["a".repeat(64)]);
    await assert.rejects(
      db.query("SELECT public.penny_form_reserve($1)", ["a".repeat(64)]),
      /RATE_LIMIT/,
    );
  } finally {
    await db.exec("RESET ROLE");
  }
});
function validForm(kind: "job" | "internship") {
  const data = new FormData();
  for (const f of (kind === "job" ? jobSections : internshipSections).flatMap((s) => s.fields)) {
    if (!f.required) continue;
    data.set(
      f.name,
      f.options?.[0] ??
        (f.type === "email"
          ? "test@example.invalid"
          : f.type === "date"
            ? "2007-01-01"
            : f.type === "number"
              ? String(f.min ?? 1)
              : "Test"),
    );
  }
  data.set("consent", "yes");
  data.set("guardian_consent", "yes");
  return data;
}
test("both legacy forms validate required fields, ranges, choices, dates and consent on the server", () => {
  for (const kind of ["job", "internship"] as const) {
    const form = validForm(kind);
    assert.ok(validateApplication(form, kind).email);
    form.delete("consent");
    assert.throws(() => validateApplication(form, kind), /Potvrdite/);
  }
  const form = validForm("internship");
  form.set("math_grade", "9");
  assert.throws(() => validateApplication(form, "internship"), /matematike/);
  const job = validForm("job");
  job.set("excel", "forged");
  assert.throws(() => validateApplication(job, "job"), /Excel/);
});
test("uploads reject spoofed types and oversized candidate files", async () => {
  await assert.rejects(checkedUpload(new File(["<html>"], "cv.pdf"), true), /Sadržaj/);
  await assert.rejects(
    checkedUpload(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "cv.pdf"), true),
    /najviše/,
  );
  assert.equal(
    (await checkedUpload(new File(["%PDF-1.7\nexample"], "cv.pdf"), true)).mime,
    "application/pdf",
  );
});
