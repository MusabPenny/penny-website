import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { missingAdminEnvironment, authEnvironment } from "./config";
import { adminDatabase } from "./database";
import { AccessError, checkedUuid, permits, type Permission, type Identity } from "./policy";

export async function getSessionIdentity(): Promise<Identity | null> {
  if (missingAdminEnvironment().length) return null;
  const session = await auth();
  const identity = session?.identity;
  if (!identity || identity.expiresAt <= Date.now() / 1000) return null;
  if (checkedUuid(identity.tenantId) !== authEnvironment().tenantId) return null;
  return { tenantId: checkedUuid(identity.tenantId), objectId: checkedUuid(identity.objectId) };
}
export async function getCurrentAppUser() {
  const identity = await getSessionIdentity();
  return identity ? adminDatabase().findUser(identity) : null;
}
export async function hasPermission(permission: Permission) {
  return permits(await getCurrentAppUser(), permission);
}
export async function requireApprovedUser() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/admin/login?reason=session");
  if (user.status === "PENDING") redirect("/admin/pristup-na-cekanju");
  if (user.status !== "APPROVED") redirect("/admin/pristup-odbijen");
  return user;
}
export async function requirePermission(permission: Permission) {
  const user = await requireApprovedUser();
  if (!permits(user, permission)) redirect("/admin/pristup-odbijen");
  return user;
}
export async function requireApiPermission(permission: Permission) {
  const user = await getCurrentAppUser();
  if (!user) throw new AccessError("UNAUTHENTICATED");
  if (!permits(user, permission)) throw new AccessError("FORBIDDEN");
  return user;
}
