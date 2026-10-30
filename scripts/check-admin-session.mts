// Read-only local integration check. The short-lived test cookie stays in
// memory and is never printed, persisted, or sent to a remote host.
import nextEnv from "@next/env";
import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { checkedUuid } from "../lib/admin/policy";

nextEnv.loadEnvConfig(process.cwd());
try {
  const origin = new URL(process.env.CHECK_BASE_URL || "http://127.0.0.1:32123");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname));
  const secret = process.env.AUTH_SECRET;
  assert.ok(secret);
  const tenantId = checkedUuid(process.env.INITIAL_SUPERADMIN_TENANT_ID);
  const objectId = checkedUuid(process.env.INITIAL_SUPERADMIN_OBJECT_ID);
  const name =
    process.env.CHECK_COOKIE_SECURE === "false"
      ? "authjs.session-token"
      : "__Secure-authjs.session-token";
  const token = await encode({
    secret,
    salt: name,
    maxAge: 60,
    token: {
      sub: tenantId + ":" + objectId,
      tenantId,
      objectId,
      identityExpiresAt: Math.floor(Date.now() / 1000) + 60,
    },
  });
  for (const path of [
    "/admin",
    "/admin/korisnici",
    "/admin/uloge",
    "/admin/audit",
    "/admin/oglasi",
    "/admin/prijave",
    "/admin/sadrzaj",
    "/admin/newsletter",
    "/admin/obavijesti",
  ]) {
    const response = await fetch(new URL(path, origin), {
      headers: { cookie: name + "=" + token },
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
    });
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(!html.includes("Portal trenutno nije dostupan"), path + ": server error");
    assert.ok(!html.includes('http-equiv="refresh"'), path + ": unexpected redirect");
    assert.match(html, /class="admin-shell"/);
    if (path === "/admin/sadrzaj" || path === "/admin/oglasi") {
      assert.match(html, /admin-entry-table/);
      assert.match(html, /data-label="Status"/);
      assert.ok(!html.includes('name="title"'), "Editor should be separate from list: " + path);
      const stylesheets = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map(
        ([tag]) => tag.match(/href="([^"]+)"/)?.[1],
      );
      assert.ok(stylesheets.length, path + ": linked stylesheets");
      const css = (
        await Promise.all(
          stylesheets.map(async (href) => {
            assert.ok(href);
            const cssUrl = new URL(href.replaceAll("&amp;", "&"), origin);
            assert.equal(cssUrl.origin, origin.origin);
            const asset = await fetch(cssUrl);
            assert.equal(asset.status, 200, path + ": CSS delivery");
            return asset.text();
          }),
        )
      ).join("\n");
      assert.match(css, /\.admin-list-heading\s*\{[^}]*display:\s*flex/);
      assert.match(css, /\.admin-record-actions\s*\{[^}]*gap:\s*12px/);
      assert.match(css, /\.admin-row-disclosure\s*\{[^}]*border-top:/);
      assert.match(css, /\.admin-responsive-table\s+tbody\s+tr\s*\{[^}]*grid-template-columns:/);
    }
    console.log("PASS:", path);
  }
  for (const path of ["/admin/sadrzaj?kind=news&new=1", "/admin/oglasi?new=1"]) {
    const response = await fetch(new URL(path, origin), {
      headers: { cookie: name + "=" + token },
      redirect: "manual",
    });
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(html.includes('name="title"'), path + ": editor");
    assert.ok(!html.includes("admin-entry-table"), path + ": list hidden while editing");
    console.log("PASS:", path);
  }
  console.log(
    "PASS: lokalno renderovanje sa serverski potpisanom testnom sesijom; ovo ne testira Entra prijavu.",
  );
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? "FAIL: " + error.message
      : "Lokalna provjera sesije nije uspjela; tajni podaci nisu ispisani.",
  );
  process.exitCode = 1;
}
