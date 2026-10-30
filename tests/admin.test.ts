import assert from "node:assert/strict";
import { before, beforeEach, after, test, mock } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { AdminRepository } from "../lib/admin/repository";
import {
  AccessError,
  identityFromClaims,
  permissionKeys,
  permits,
  type LoginIdentity,
  type Permission,
} from "../lib/admin/policy";
import { authEnvironment } from "../lib/admin/config";
import { verifyEntraIdToken } from "../lib/admin/entra";
import { buildAuthConfig } from "../lib/admin/auth-config";
import { Auth } from "@auth/core";
import { encode } from "next-auth/jwt";
import { buildMigrationSql, migrationChecksum } from "../lib/admin/migrations";
import type { Identity } from "../lib/admin/policy";

const tenantId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const first = { tenantId, objectId: "11111111-1111-1111-1111-111111111111" };
const second = { tenantId, objectId: "22222222-2222-2222-2222-222222222222" };
const ordinary = { tenantId, objectId: "33333333-3333-3333-3333-333333333333" };
const login = (identity = ordinary): LoginIdentity => ({
  ...identity,
  email: "test@example.invalid",
  displayName: "Test korisnik",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
});
let db: PGlite;
let repo: AdminRepository;
before(async () => {
  db = new PGlite();
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;",
  );
  const migrations = await Promise.all(
    ["001_admin_rbac.sql", "002_supabase_admin_rpc.sql"].map(async (name) => ({
      name,
      sql: await readFile(`db/migrations/${name}`, "utf8"),
    })),
  );
  const sql = buildMigrationSql(migrations);
  await db.exec(sql);
  await db.exec(sql); // The same production migration runner must be idempotent.
  assert.equal((await db.query("SELECT * FROM public.penny_admin_migrations")).rows.length, 2);
  repo = new AdminRepository(
    {
      rpc: async (_name, args) => {
        await db.exec("SET ROLE service_role");
        try {
          const result = await db.query<{ result: unknown }>(
            "SELECT public.penny_admin_execute($1::uuid,$2::uuid,$3::text,$4::jsonb) AS result",
            [args.p_tenant_id, args.p_object_id, args.p_action, JSON.stringify(args.p_payload)],
          );
          return { data: result.rows[0].result, error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              code: String((error as { code?: string }).code),
              message: error instanceof Error ? error.message : "Unknown",
            },
          };
        } finally {
          await db.exec("RESET ROLE");
        }
      },
    },
    first,
  );
});
beforeEach(async () => {
  await db.exec(
    "TRUNCATE public.audit_logs,public.user_roles,public.role_permissions,public.app_users,public.roles,public.permissions CASCADE;",
  );
  await db.query(
    "INSERT INTO public.roles(name,description) VALUES('ADMIN','Admin'),('USER','Korisnik')",
  );
  for (const key of permissionKeys)
    await db.query("INSERT INTO public.permissions(key) VALUES($1) ON CONFLICT DO NOTHING", [key]);
  await seed(first);
});
after(async () => {
  await db?.close();
});

async function roleId(name: string) {
  return (await repo.roles()).find((role) => role.name === name)!.id;
}
async function giveAdmin(keys: Permission[]) {
  const user = await repo.registerLogin(login());
  await repo.changeStatus(first, user.id, "APPROVED");
  const role = await roleId("ADMIN");
  await repo.updateRolePermissions(first, role, keys);
  await repo.changeUserRole(first, user.id, role, true);
  return (await repo.findUser(ordinary))!;
}
function expectCode(code: string) {
  return (error: unknown) => error instanceof AccessError && error.code === code;
}
async function seed(identity: Identity) {
  await db.query("SELECT penny_admin.bootstrap($1::uuid,$2::uuid)", [
    identity.tenantId,
    identity.objectId,
  ]);
}

test("privremeni neuspjeh čitanja se oporavlja jednim ponovnim upitom", async () => {
  let calls = 0;
  const client = new AdminRepository(
    {
      rpc: async () => {
        calls++;
        return calls === 1
          ? { data: null, error: { code: "", message: "fetch failed" }, status: 0 }
          : { data: { users: [], total: 0 }, error: null, status: 200 };
      },
    },
    first,
  );
  assert.equal((await client.users()).total, 0);
  assert.equal(calls, 2);
});
test("odbijene dozvole i promjene podataka se ne ponavljaju automatski", async () => {
  let calls = 0;
  const forbidden = new AdminRepository(
    {
      rpc: async () => {
        calls++;
        return { data: null, error: { code: "PT403", message: "FORBIDDEN" }, status: 403 };
      },
    },
    first,
  );
  await assert.rejects(forbidden.users(), expectCode("FORBIDDEN"));
  assert.equal(calls, 1);
  calls = 0;
  const logger = mock.method(console, "error", () => {});
  try {
    const mutation = new AdminRepository(
      {
        rpc: async () => {
          calls++;
          return {
            data: null,
            error: { code: "PGRST000", message: "private response body" },
            status: 503,
          };
        },
      },
      first,
    );
    await assert.rejects(
      mutation.changeStatus(first, second.objectId, "APPROVED"),
      /Administratorska baza/,
    );
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(logger.mock.calls).includes("private response body"));
  } finally {
    logger.mock.restore();
  }
});
test("ponavljanje neuspjelog čitanja je ograničeno na dva pokušaja", async () => {
  let calls = 0;
  const logger = mock.method(console, "error", () => {});
  try {
    const client = new AdminRepository(
      {
        rpc: async () => {
          calls++;
          return { data: null, error: { code: "PGRST000", message: "unavailable" }, status: 503 };
        },
      },
      first,
    );
    await assert.rejects(client.counts(), /Administratorska baza/);
    assert.equal(calls, 2);
  } finally {
    logger.mock.restore();
  }
});

test("novi korisnik ostaje PENDING, nema uloga i nema pristup dashboardu", async () => {
  const user = await repo.registerLogin(login());
  assert.equal(user.status, "PENDING");
  assert.deepEqual(user.roles, []);
  assert.equal(permits(user, "dashboard.read"), false);
  assert.equal(user.last_login_at, null);
  assert.equal((await repo.auditEntries())[0].action, "LOGIN_DENIED");
});
test("odobreni identitet pristupa samo izričito dodijeljenim dozvolama", async () => {
  const user = await giveAdmin(["dashboard.read"]);
  assert.equal(permits(user, "dashboard.read"), true);
  assert.equal(permits(user, "users.approve"), false);
  await repo.registerLogin(login());
  assert.equal((await repo.findUser(ordinary))?.status, "APPROVED");
  assert.ok((await repo.findUser(ordinary))?.last_login_at);
  assert.ok((await repo.auditEntries()).some((entry) => entry.action === "LOGIN_SUCCESS"));
});
test("ponovna prijava ne odobrava PENDING niti vraća DISABLED račun", async () => {
  const user = await repo.registerLogin(login());
  await repo.registerLogin(login());
  assert.equal((await repo.findUser(ordinary))?.status, "PENDING");
  await repo.changeStatus(first, user.id, "DISABLED");
  await repo.registerLogin(login());
  assert.equal((await repo.findUser(ordinary))?.status, "DISABLED");
});
test("stara sesija deaktiviranog korisnika ne omogućava serverske promjene", async () => {
  const actor = await giveAdmin(["dashboard.read", "users.approve"]);
  const target = await repo.registerLogin(login(second));
  await repo.changeStatus(first, actor.id, "DISABLED");
  assert.equal(permits(await repo.findUser(ordinary), "dashboard.read"), false);
  await assert.rejects(repo.changeStatus(ordinary, target.id, "APPROVED"), expectCode("FORBIDDEN"));
  assert.equal((await repo.findUser(second))?.status, "PENDING");
});
test("odobren korisnik bez users.approve i bez identiteta ne može odobravati", async () => {
  await giveAdmin(["dashboard.read"]);
  const target = await repo.registerLogin(login(second));
  await assert.rejects(repo.changeStatus(ordinary, target.id, "APPROVED"), expectCode("FORBIDDEN"));
  await assert.rejects(
    repo.changeStatus(
      { ...ordinary, objectId: "44444444-4444-4444-4444-444444444444" },
      target.id,
      "APPROVED",
    ),
    expectCode("UNAUTHENTICATED"),
  );
});
test("manipulacija SUPER_ADMIN rolom i povećanje privilegija su odbijeni", async () => {
  await giveAdmin(["users.manage_roles", "roles.manage"]);
  const target = await repo.registerLogin(login(second));
  await assert.rejects(
    repo.changeUserRole(ordinary, target.id, await roleId("SUPER_ADMIN"), true),
    expectCode("FORBIDDEN"),
  );
  await assert.rejects(
    repo.updateRolePermissions(ordinary, await roleId("USER"), ["audit.read"]),
    expectCode("FORBIDDEN"),
  );
  await assert.rejects(
    repo.updateRolePermissions(ordinary, await roleId("SUPER_ADMIN"), []),
    expectCode("FORBIDDEN"),
  );
  assert.deepEqual((await repo.findUser(second))?.roles, []);
});
test("administrator ne može sam sebi mijenjati uloge ili proširiti vlastitu ulogu", async () => {
  const actor = await giveAdmin(["users.manage_roles", "roles.manage"]);
  await assert.rejects(
    repo.changeUserRole(ordinary, actor.id, await roleId("USER"), true),
    expectCode("SELF_CHANGE"),
  );
  await assert.rejects(
    repo.updateRolePermissions(ordinary, await roleId("ADMIN"), ["roles.manage"]),
    expectCode("SELF_CHANGE"),
  );
});
test("posljednji aktivni superadministrator je zaštićen", async () => {
  const user = (await repo.findUser(first))!;
  await assert.rejects(
    repo.changeStatus(first, user.id, "DISABLED"),
    expectCode("LAST_SUPERADMIN"),
  );
  await assert.rejects(
    repo.changeUserRole(first, user.id, await roleId("SUPER_ADMIN"), false),
    expectCode("LAST_SUPERADMIN"),
  );
  await seed(second);
  await repo.changeStatus(second, user.id, "DISABLED");
  assert.equal((await repo.findUser(first))?.status, "DISABLED");
  const remaining = (await repo.findUser(second))!;
  await assert.rejects(
    repo.changeStatus(second, remaining.id, "DISABLED"),
    expectCode("LAST_SUPERADMIN"),
  );
});
test("seed je idempotentan, identitet koristi tenant+oid umjesto emaila", async () => {
  await seed(first);
  const user = (await repo.findUser(first))!;
  assert.deepEqual(user.roles, ["SUPER_ADMIN"]);
  assert.equal(user.permissions.length, permissionKeys.length);
  assert.equal((await repo.users()).total, 1);
  const a = await repo.registerLogin(login());
  const b = await repo.registerLogin(login(second));
  assert.equal(a.email, b.email);
  assert.notEqual(a.id, b.id);
});
test("status, uloge i dozvole se evidentiraju, neuspjeli upit ne ostavlja djelimičnu promjenu", async () => {
  const user = await repo.registerLogin(login());
  await repo.changeStatus(first, user.id, "APPROVED");
  const role = await roleId("USER");
  await repo.updateRolePermissions(first, role, ["dashboard.read"]);
  await repo.changeUserRole(first, user.id, role, true);
  await repo.changeUserRole(first, user.id, role, false);
  await repo.changeStatus(first, user.id, "DISABLED");
  await repo.logout(first);
  const logs = await repo.auditEntries();
  for (const action of [
    "USER_APPROVED",
    "USER_DISABLED",
    "ROLE_ASSIGNED",
    "ROLE_REMOVED",
    "ROLE_PERMISSIONS_UPDATED",
    "LOGOUT",
  ])
    assert.ok(logs.some((entry) => entry.action === action));
  const actor = (await repo.findUser(first))!;
  assert.ok(
    logs
      .filter((entry) => entry.action.startsWith("ROLE_"))
      .every((entry) => entry.actor_name === actor.display_name),
  );
  await db.exec(
    "CREATE FUNCTION public.reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test'; END $$; CREATE TRIGGER reject_audit BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.reject_test_audit();",
  );
  try {
    await assert.rejects(repo.changeStatus(first, user.id, "APPROVED"));
  } finally {
    await db.exec(
      "DROP TRIGGER reject_audit ON public.audit_logs; DROP FUNCTION public.reject_test_audit();",
    );
  }
  assert.equal((await repo.findUser(ordinary))?.status, "DISABLED");
});
test("RLS i grantovi blokiraju anon/authenticated, runtime ne može mijenjati audit", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    try {
      await assert.rejects(db.query("SELECT * FROM public.app_users"));
      await assert.rejects(
        db.query("SELECT public.penny_admin_execute($1,$2,'users','{}')", [
          first.tenantId,
          first.objectId,
        ]),
      );
    } finally {
      await db.exec("RESET ROLE");
    }
  }
  await db.exec("SET ROLE service_role");
  try {
    assert.equal((await db.query("SELECT * FROM public.app_users")).rows.length, 1);
    await assert.rejects(db.query("DELETE FROM public.audit_logs"));
    await assert.rejects(db.query("UPDATE public.audit_logs SET action='tampered'"));
    await assert.rejects(db.query("DROP TABLE public.permissions"));
    await assert.rejects(
      db.query("SELECT penny_admin.bootstrap($1,$2)", [first.tenantId, first.objectId]),
    );
  } finally {
    await db.exec("RESET ROLE");
  }
});
test("stvarni RS256 potpis, issuer, audience, tenant, oid, expiry i app role su obavezni", async () => {
  const clientId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const config = {
    tenantId,
    clientId,
    secret: "unused-in-test",
    clientSecret: "unused-in-test",
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    accessRole: "Portal.Access",
  };
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "test", alg: "RS256" }],
  });
  const claims = {
    tid: tenantId,
    oid: ordinary.objectId,
    roles: ["Portal.Access"],
    nonce: "test-nonce",
    email: "same@example.invalid",
  };
  const sign = (overrides = {}) =>
    new SignJWT({ ...claims, ...overrides })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer(config.issuer)
      .setAudience(clientId)
      .setSubject("test-subject")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
  assert.equal((await verifyEntraIdToken(await sign(), config, keys)).objectId, ordinary.objectId);
  for (const overrides of [
    { roles: [] },
    { roles: undefined },
    { tid: second.objectId },
    { oid: undefined },
    { oid: "email@example.invalid" },
    { nonce: undefined },
  ]) {
    await assert.rejects(verifyEntraIdToken(await sign(overrides), config, keys));
  }
  const valid = await sign();
  await assert.rejects(
    verifyEntraIdToken(valid, { ...config, issuer: "https://wrong.invalid" }, keys),
  );
  await assert.rejects(verifyEntraIdToken(valid, { ...config, clientId: first.objectId }, keys));
  const sections = valid.split(".");
  sections[1] = Buffer.from(
    JSON.stringify({ ...claims, roles: ["Portal.Access", "ADMIN"] }),
  ).toString("base64url");
  await assert.rejects(verifyEntraIdToken(sections.join("."), config, keys));
  const expired = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(config.issuer)
    .setAudience(clientId)
    .setSubject("sub")
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(privateKey);
  await assert.rejects(verifyEntraIdToken(expired, config, keys));
  assert.throws(() => identityFromClaims({ ...claims, exp: 0 }, tenantId, "Portal.Access"));
});
test("nedostajuće tajne daju samo imena varijabli", () => {
  const saved = process.env.AUTH_SECRET;
  delete process.env.AUTH_SECRET;
  try {
    assert.throws(authEnvironment, /AUTH_SECRET/);
  } finally {
    if (saved !== undefined) process.env.AUTH_SECRET = saved;
  }
});

test("izmijenjena primijenjena migracija se odbija bez promjene postojeće baze", async () => {
  const sql = await readFile("db/migrations/001_admin_rbac.sql", "utf8");
  assert.equal(migrationChecksum(sql), migrationChecksum(sql.replace(/\r?\n/g, "\r\n")));
  try {
    await assert.rejects(
      db.exec(buildMigrationSql([{ name: "001_admin_rbac.sql", sql: sql + "\n-- edited" }])),
      /Checksum mismatch/,
    );
  } finally {
    await db.exec("ROLLBACK");
  }
  assert.equal((await repo.users()).total, 1);
});

test("instalirani Auth.js čuva mapirani identitet u user, a raw profile nema custom polja", async () => {
  const config = {
    tenantId,
    clientId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    clientSecret: "test-only",
    secret: "test-secret-at-least-32-characters-long",
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    accessRole: "Portal.Access",
  };
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: "authjs-test", alg: "RS256" }],
  });
  const raw = {
    tid: tenantId,
    oid: ordinary.objectId,
    roles: ["Portal.Access"],
    nonce: "nonce",
    name: "Mapped korisnik",
  };
  const idToken = await new SignJWT(raw)
    .setProtectedHeader({ alg: "RS256", kid: "authjs-test" })
    .setIssuer(config.issuer)
    .setAudience(config.clientId)
    .setSubject("sub")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
  const options = buildAuthConfig(
    config,
    () => repo,
    (token, environment) => verifyEntraIdToken(token, environment, keys),
  );
  // Exercise the installed library's real mapping, rather than assuming that
  // its callback profile contains fields returned by provider.profile().
  const { getUserAndAccount } = await import(
    new URL("../node_modules/@auth/core/lib/actions/callback/oauth/callback.js", import.meta.url)
      .href
  );
  const mapped = await getUserAndAccount(
    raw,
    options.providers[0],
    { id_token: idToken, access_token: "test-access-token-never-persisted" },
    { debug() {}, error() {} },
  );
  assert.equal(raw["entraIdentity" as keyof typeof raw], undefined);
  assert.equal(mapped.user.entraIdentity.objectId, ordinary.objectId);
  assert.notEqual(mapped.user.id, ordinary.objectId);
  assert.equal(
    await options.callbacks.signIn({ user: mapped.user, account: mapped.account, profile: raw }),
    true,
  );
  assert.equal((await repo.findUser(ordinary))?.status, "PENDING");
  const token = await options.callbacks.jwt({
    token: {},
    user: mapped.user,
    account: mapped.account,
    profile: raw,
    trigger: "signIn",
    isNewUser: true,
  });
  assert.equal(token?.objectId, ordinary.objectId);
  assert.equal("access_token" in token!, false);
  assert.equal("id_token" in token!, false);
  const user = (await repo.findUser(ordinary))!;
  await repo.changeStatus(first, user.id, "DISABLED");
  assert.equal(
    await options.callbacks.signIn({ user: mapped.user, account: mapped.account, profile: raw }),
    "/admin/pristup-odbijen",
  );
});

test("stvarni Auth.js HTTP session: istek, ignorisanje client update-a i CSRF odjava", async () => {
  const secret = "test-only-secret-32-characters-or-more";
  const options = {
    ...buildAuthConfig(
      {
        tenantId,
        clientId: second.objectId,
        clientSecret: "test-only",
        secret,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        accessRole: "Portal.Access",
      },
      () => repo,
    ),
    trustHost: true,
    useSecureCookies: false,
    basePath: "/api/auth",
  };
  const token = {
    sub: `${tenantId}:${first.objectId}`,
    tenantId,
    objectId: first.objectId,
    identityExpiresAt: Math.floor(Date.now() / 1000) + 300,
  };
  const cookie = `authjs.session-token=${await encode({ token, secret, salt: "authjs.session-token", maxAge: 3600 })}`;
  const request = (path: string, init?: RequestInit) =>
    Auth(new Request(`http://localhost:3000/api/auth/${path}`, init), options);
  const session = await request("session", { headers: { cookie } });
  const body = await session.json();
  assert.equal(body.identity.objectId, first.objectId);
  assert.equal(body.identity.expiresAt, token.identityExpiresAt);
  assert.equal(body.access_token, undefined);
  const expiredCookie = `authjs.session-token=${await encode({ token: { ...token, identityExpiresAt: 1 }, secret, salt: "authjs.session-token", maxAge: 3600 })}`;
  assert.equal(
    await (await request("session", { headers: { cookie: expiredCookie } })).json(),
    null,
  );
  const unchanged = await options.callbacks.jwt({
    token,
    trigger: "update",
    session: {
      identityExpiresAt: Date.now() + 999999999,
      objectId: second.objectId,
      roles: ["SUPER_ADMIN"],
    },
    user: undefined as never,
  });
  assert.equal(unchanged?.objectId, first.objectId);
  assert.equal(unchanged?.identityExpiresAt, token.identityExpiresAt);
  const csrf = await request("csrf");
  const csrfBody = await csrf.json();
  const csrfCookie = csrf.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const signout = await request("signout", {
    method: "POST",
    headers: {
      cookie: `${cookie}; ${csrfCookie}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      csrfToken: csrfBody.csrfToken,
      callbackUrl: "http://localhost:3000/admin/login",
    }),
  });
  assert.ok(
    signout.headers
      .getSetCookie()
      .some((value) => value.startsWith("authjs.session-token=;") && /Max-Age=0/i.test(value)),
  );
  assert.ok((await repo.auditEntries()).some((entry) => entry.action === "LOGOUT"));
  assert.equal(await (await request("session")).json(), null);
});
