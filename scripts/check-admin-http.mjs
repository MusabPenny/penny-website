import assert from "node:assert/strict";

const origin = process.env.CHECK_BASE_URL || "http://127.0.0.1:32123";
for (const path of [
  "/admin",
  "/admin/korisnici",
  "/admin/uloge",
  "/admin/audit",
  "/admin/oglasi",
  "/admin/sadrzaj",
  "/admin/prijave",
  "/admin/newsletter",
  "/admin/imenik",
  "/admin/obavijesti",
  "/admin/pristup-na-cekanju",
]) {
  const response = await fetch(`${origin}${path}`, { redirect: "manual" });
  const body = await response.text();
  assert.ok([200, 307].includes(response.status), path);
  if (response.status === 307)
    assert.match(response.headers.get("location") || "", /\/admin\/login/);
  else assert.match(body, /http-equiv="refresh"[^>]*\/admin\/login/);
  assert.ok(!body.includes('class="admin-table"'), `${path}: no private table`);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.match(response.headers.get("x-robots-tag") || "", /noindex/);
}
const login = await fetch(`${origin}/admin/login`);
assert.equal(login.status, 200);
const html = await login.text();
assert.match(html, /Prijava poslovnim Microsoft/);
assert.match(html, /name="robots" content="noindex, nofollow"/);
assert.doesNotMatch(html, /sb_secret_|postgres(?:ql)?:\/\/|stack trace/i);
const api = await fetch(`${origin}/api/admin/users`);
assert.equal(api.status, 401);
assert.deepEqual(await api.json(), { error: "Potrebna je prijava." });
assert.equal((await fetch(`${origin}/api/internal/mail-worker`)).status, 401);
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
assert.ok(!sitemap.includes("/admin"));
console.log("PASS: anonimna zaštita admin ruta, API 401, login, noindex, no-store i sitemap.");
