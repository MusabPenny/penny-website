import {
  AccessError,
  checkedUuid,
  permissionKeys,
  type AppUser,
  type Identity,
  type LoginIdentity,
  type Permission,
} from "./policy";

export type Role = { id: string; name: string; description: string; permissions: Permission[] };
export type AuditEntry = {
  id: string;
  action: string;
  actor_name: string | null;
  target_type: string;
  target_id: string | null;
  created_at: Date | string;
  details: Record<string, unknown>;
};
export type RpcArgs = {
  p_tenant_id: string | null;
  p_object_id: string | null;
  p_action: string;
  p_payload: Record<string, unknown>;
};
export type RpcTransport = {
  rpc(
    name: "penny_admin_execute",
    args: RpcArgs,
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
    status?: number;
  }>;
};

export class AdminRepository {
  constructor(
    private readonly client: RpcTransport,
    private readonly actor: Identity | null = null,
  ) {}
  private async call<T>(
    action: string,
    payload: Record<string, unknown> = {},
    identity = this.actor,
  ): Promise<T> {
    const args = {
      p_tenant_id: identity ? checkedUuid(identity.tenantId) : null,
      p_object_id: identity ? checkedUuid(identity.objectId) : null,
      p_action: action,
      p_payload: payload,
    };
    let response = await this.client.rpc("penny_admin_execute", args);
    // Supabase uses POST for this RPC, so the SDK cannot know which actions
    // are safe to retry. Retry only explicit read operations, once.
    if (
      response.error &&
      ["user", "users", "roles", "counts", "audit"].includes(action) &&
      [0, 502, 503, 504].includes(response.status ?? -1)
    ) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      response = await this.client.rpc("penny_admin_execute", args);
    }
    const { data, error } = response;
    if (error) {
      const known = [
        "UNAUTHENTICATED",
        "FORBIDDEN",
        "INVALID_INPUT",
        "LAST_SUPERADMIN",
        "SELF_CHANGE",
      ] as const;
      const code = known.find((code) => error.message === code);
      if (code) throw new AccessError(code);
      console.error("Admin RPC nije uspio", {
        operation: action,
        code:
          typeof error.code === "string" && /^[A-Z0-9_]{1,32}$/.test(error.code)
            ? error.code
            : "NETWORK_OR_UNKNOWN",
      });
      // Never expose database response details, request headers or credentials.
      throw new Error("Administratorska baza trenutno nije dostupna.");
    }
    return data as T;
  }
  private read<T>(action: string, payload: Record<string, unknown> = {}) {
    if (!this.actor) throw new AccessError("UNAUTHENTICATED");
    return this.call<T>(action, payload);
  }
  findUser(identity: Identity) {
    return this.call<AppUser | null>("user", {}, identity);
  }
  registerLogin(identity: LoginIdentity) {
    return this.call<AppUser>(
      "login",
      { email: identity.email, displayName: identity.displayName },
      identity,
    );
  }
  deniedLogin() {
    return this.call<null>("login_denied", {}, null);
  }
  logout(identity: Identity) {
    return this.call<null>("logout", {}, identity);
  }
  users(query = "", status = "", page = 1) {
    return this.read<{ users: AppUser[]; total: number }>("users", {
      query: query.slice(0, 100),
      status,
      page,
    });
  }
  roles() {
    return this.read<Role[]>("roles");
  }
  auditEntries(page = 1) {
    return this.read<AuditEntry[]>("audit", { page });
  }
  counts() {
    return this.read<{ total: number; approved: number; pending: number; disabled: number }>(
      "counts",
    );
  }
  changeStatus(identity: Identity, targetId: string, status: "APPROVED" | "DISABLED") {
    if (!["APPROVED", "DISABLED"].includes(status)) throw new AccessError("INVALID_INPUT");
    return this.call<null>(
      status === "APPROVED" ? "approve" : "disable",
      { targetId: checkedUuid(targetId) },
      identity,
    );
  }
  changeUserRole(identity: Identity, targetId: string, roleId: string, assign: boolean) {
    return this.call<null>(
      assign ? "assign" : "remove",
      { targetId: checkedUuid(targetId), roleId: checkedUuid(roleId) },
      identity,
    );
  }
  updateRolePermissions(identity: Identity, roleId: string, keys: Permission[]) {
    if (keys.length !== new Set(keys).size || keys.some((key) => !permissionKeys.includes(key)))
      throw new AccessError("INVALID_INPUT");
    return this.call<null>("permissions", { targetId: checkedUuid(roleId), keys }, identity);
  }
}
