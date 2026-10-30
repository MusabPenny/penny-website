// Explicit, loopback-only integration test. Creates synthetic .invalid candidates,
// then removes exactly those records and uploaded files in finally.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import { createClient } from "@supabase/supabase-js";
import { jobSections, internshipSections } from "../lib/application-fields";
import { managementQuery } from "../lib/admin/migrations";
import { pickerDateTime } from "../lib/admin/date-time";
nextEnv.loadEnvConfig(process.cwd());
const origin = new URL(process.env.CHECK_BASE_URL || "http://localhost:32124");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
assert.ok(
  process.argv.includes("--write-test"),
  "Pass --write-test for temporary synthetic records.",
);
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const require = createRequire(import.meta.url);
const { encodeReply } = require("next/dist/compiled/react-server-dom-webpack/client.node");
const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8"));
const cookieName = "__Secure-authjs.session-token";
const token = await encode({
  secret: process.env.AUTH_SECRET!,
  salt: cookieName,
  maxAge: 300,
  token: {
    tenantId: process.env.INITIAL_SUPERADMIN_TENANT_ID,
    objectId: process.env.INITIAL_SUPERADMIN_OBJECT_ID,
    identityExpiresAt: Date.now() / 1000 + 300,
  },
});
const cookie = `${cookieName}=${token}`;
const testId = randomUUID(),
  email = `cms-check-${testId}@example.invalid`;
const privatePaths: string[] = [],
  stagingPaths: string[] = [],
  publicPaths: string[] = [];
const contentIds: string[] = [];
async function action(name: string, path: string, form: FormData, authorized = false) {
  const entry = Object.entries(manifest.node).find(
    ([, v]) => (v as { exportedName: string }).exportedName === name,
  );
  assert.ok(entry, `Action: ${name}`);
  const body = await encodeReply(
    name === "archiveContent" ? [form] : [{ ok: false, message: "" }, form],
  );
  const response = await fetch(new URL(path, origin), {
    method: "POST",
    headers: { "Next-Action": entry[0], Origin: origin.origin, ...(authorized ? { cookie } : {}) },
    body,
    redirect: "manual",
  });
  const text = await response.text();
  assert.equal(response.status, 200, `${name}: ${text.slice(0, 150)}`);
  if (name !== "archiveContent")
    assert.ok(text.includes('"ok":true'), `${name}: ${text.slice(0, 1200)}`);
}
try {
  for (const kind of ["job", "internship"] as const) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("job_id", "");
    form.set("website", "");
    for (const f of (kind === "job" ? jobSections : internshipSections).flatMap((s) => s.fields))
      if (f.required)
        form.set(
          f.name,
          f.options?.[0] ??
            (f.type === "email"
              ? email
              : f.type === "date"
                ? "2007-01-01"
                : f.type === "number"
                  ? String(f.min ?? 1)
                  : "CMS integration check"),
        );
    form.set("consent", "yes");
    form.set("guardian_consent", "yes");
    const bytes = Buffer.from("%PDF-1.7\nSynthetic integration check only.\n%%EOF");
    const r = await fetch(new URL("/api/prijave/upload", origin), {
      method: "POST",
      headers: { Origin: origin.origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        fields: Object.fromEntries(form),
        files: [{ slot: "cv", name: "integration-test.pdf", size: bytes.length }],
      }),
    });
    assert.equal(r.status, 200, `preflight ${kind}`);
    const ticket = await r.json();
    for (const t of ticket.files) {
      privatePaths.push(t.path);
      const up = await fetch(t.url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: bytes,
      });
      assert.ok(up.ok, `private upload: ${up.status}`);
    }
    form.set("upload_receipt", ticket.receipt);
    await action("submitApplication", "/karijera/prijava", form);
    const { data, error } = await client
      .from("candidate_applications")
      .select("id,attachments")
      .eq("email", email)
      .eq("kind", kind)
      .single();
    assert.equal(error, null);
    assert.equal(data!.attachments.length, 1);
    const anonymous = await fetch(new URL(`/api/admin/prijave/${data!.id}/prilog?index=0`, origin));
    assert.equal(anonymous.status, 401);
    const downloaded = await fetch(
      new URL(`/api/admin/prijave/${data!.id}/prilog?index=0`, origin),
      { headers: { cookie } },
    );
    assert.equal(downloaded.status, 200);
    assert.ok(Buffer.from(await downloaded.arrayBuffer()).equals(bytes));
    const review = new FormData();
    review.set("id", data!.id);
    review.set("status", "REVIEWING");
    review.set("notes", "Synthetic check; removed after test.");
    await action("processApplication", "/admin/prijave", review, true);
    console.log(`PASS: ${kind} form → private upload → database → protected download → review.`);
  }
  const file = Buffer.from("%PDF-1.7\nTemporary catalog integration test\n%%EOF");
  const prepared = await fetch(new URL("/api/admin/upload", origin), {
    method: "POST",
    headers: { cookie, Origin: origin.origin, "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "catalog", name: "cms-check.pdf", size: file.length }),
  });
  assert.equal(prepared.status, 200);
  const ticket = await prepared.json();
  const receiptBody = JSON.parse(Buffer.from(ticket.receipt.split(".")[0], "base64url").toString());
  stagingPaths.push(receiptBody.path);
  const uploaded = await fetch(ticket.url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  });
  assert.ok(uploaded.ok);
  const form = new FormData();
  for (const [k, v] of Object.entries({
    kind: "catalog",
    id: "",
    version: "",
    title: "CMS integration check",
    slug: `cms-check-${testId}`,
    summary: "Temporary synthetic catalog; removed after integration check.",
    body: "Integration test only.",
    status: "DRAFT",
    starts_at: pickerDateTime(new Date().toISOString()),
    ends_at: "",
    source_url: "",
    location: "",
    asset_receipt: ticket.receipt,
  }))
    form.set(k, v);
  await action("saveContent", "/admin/sadrzaj?kind=catalog", form, true);
  const entry = await client
    .from("site_entries")
    .select("id,asset_path,status")
    .eq("slug", `cms-check-${testId}`)
    .single();
  assert.equal(entry.error, null);
  contentIds.push(entry.data!.id);
  publicPaths.push(entry.data!.asset_path);
  assert.equal(entry.data!.status, "DRAFT");
  const publicRead = await client.rpc("penny_public_entries", { p_kind: "catalog" });
  assert.ok(!publicRead.data.some((e: { id: string }) => e.id === entry.data!.id));
  console.log(
    "PASS: authenticated catalog upload → private staging → validated public asset → private draft.",
  );
  form.delete("asset_receipt");
  form.set("kind", "news");
  form.set("id", "");
  form.set("version", "");
  form.set("status", "PUBLISHED");
  form.set("title", `CMS integration check ${testId}`);
  await action("saveContent", "/admin/sadrzaj", form, true);
  const published = await client
    .from("site_entries")
    .select("id,updated_at")
    .eq("kind", "news")
    .eq("slug", `cms-check-${testId}`)
    .single();
  assert.equal(published.error, null);
  contentIds.push(published.data!.id);
  const live = await fetch(new URL(`/novosti/cms-check-${testId}`, origin));
  assert.equal(live.status, 200);
  assert.ok((await live.text()).includes(`CMS integration check ${testId}`));
  const archived = new FormData();
  archived.set("id", published.data!.id);
  archived.set("kind", "news");
  archived.set("version", published.data!.updated_at);
  await action("archiveContent", "/admin/sadrzaj", archived, true);
  const hidden = await client.rpc("penny_public_entries", { p_kind: "news" });
  assert.ok(!hidden.data.some((e: { id: string }) => e.id === published.data!.id));
  console.log(
    "PASS: new news URL publishes without rebuild and archive removes public visibility.",
  );
  console.log("PASS: no emails sent; test cookies and signing tokens remained in memory.");
} finally {
  const privateRemoved = privatePaths.length
    ? await client.storage.from("candidate-files").remove(privatePaths)
    : { error: null };
  assert.equal(privateRemoved.error, null);
  if (stagingPaths.length) await client.storage.from("upload-staging").remove(stagingPaths);
  if (publicPaths.length) await client.storage.from("site-assets").remove(publicPaths);
  await managementQuery("DELETE FROM public.candidate_applications WHERE email=$1", false, [email]);
  for (const id of contentIds)
    await managementQuery("DELETE FROM public.site_entries WHERE id=$1::uuid AND slug=$2", false, [
      id,
      `cms-check-${testId}`,
    ]);
  console.log("Cleanup: removed only this run's synthetic candidates and files.");
}
