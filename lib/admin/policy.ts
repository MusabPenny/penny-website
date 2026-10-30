export const permissionKeys = [
  "dashboard.read",
  "users.read",
  "users.approve",
  "users.disable",
  "users.manage_roles",
  "roles.read",
  "roles.manage",
  "audit.read",
  "jobs.manage",
  "applications.manage",
  "content.manage",
  "directory.manage",
] as const;
export type Permission = (typeof permissionKeys)[number];
export type UserStatus = "PENDING" | "APPROVED" | "DISABLED";
export type Identity = { tenantId: string; objectId: string };
export type LoginIdentity = Identity & {
  email: string | null;
  displayName: string;
  expiresAt: number;
};
export type AppUser = {
  id: string;
  tenant_id: string;
  object_id: string;
  email: string | null;
  display_name: string;
  status: UserStatus;
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  roles: string[];
  permissions: Permission[];
};
export class AccessError extends Error {
  constructor(
    public readonly code:
      "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "LAST_SUPERADMIN" | "SELF_CHANGE",
  ) {
    super(code);
  }
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function checkedUuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw new AccessError("INVALID_INPUT");
  return value.toLowerCase();
}
export function permits(user: AppUser | null, permission: Permission): boolean {
  return user?.status === "APPROVED" && user.permissions.includes(permission);
}
export function enforce(user: AppUser | null, permission: Permission): asserts user is AppUser {
  if (!user) throw new AccessError("UNAUTHENTICATED");
  if (!permits(user, permission)) throw new AccessError("FORBIDDEN");
}

// Call only with claims from a cryptographically verified ID token.
export function identityFromClaims(
  claims: Record<string, unknown>,
  tenantId: string,
  role: string,
): LoginIdentity {
  const tid = checkedUuid(claims.tid);
  const oid = checkedUuid(claims.oid);
  if (
    tid !== checkedUuid(tenantId) ||
    !Array.isArray(claims.roles) ||
    !claims.roles.includes(role)
  ) {
    throw new AccessError("FORBIDDEN");
  }
  if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000))
    throw new AccessError("FORBIDDEN");
  return {
    tenantId: tid,
    objectId: oid,
    email:
      typeof claims.email === "string"
        ? claims.email.slice(0, 320)
        : typeof claims.preferred_username === "string"
          ? claims.preferred_username.slice(0, 320)
          : null,
    displayName: typeof claims.name === "string" ? claims.name.slice(0, 200) : "Microsoft korisnik",
    expiresAt: Math.min(claims.exp, Math.floor(Date.now() / 1000) + 3600),
  };
}
