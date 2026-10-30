"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { getSessionIdentity } from "@/lib/admin/access";
import { missingAdminEnvironment } from "@/lib/admin/config";
import { adminDatabase } from "@/lib/admin/database";
import { AccessError, checkedUuid, permissionKeys, type Permission } from "@/lib/admin/policy";

export async function microsoftLogin() {
  if (missingAdminEnvironment().length) redirect("/admin/login?reason=configuration");
  try {
    await signIn("microsoft-entra-id", { redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/admin/login?reason=failed");
    throw error;
  }
}
export async function logout() {
  await signOut({ redirectTo: "/admin/login?reason=logout" });
}

export type ActionState = { ok: boolean; message: string };
function field(data: FormData, name: string) {
  const value = data.get(name);
  if (typeof value !== "string") throw new AccessError("INVALID_INPUT");
  return value;
}
export async function mutateAdmin(_previous: ActionState, data: FormData): Promise<ActionState> {
  try {
    // This action is public over HTTP; derive the actor only from Auth.js.
    const identity = await getSessionIdentity();
    if (!identity) return { ok: false, message: "Sesija je istekla. Prijavite se ponovo." };
    if (field(data, "confirmed") !== "yes") throw new AccessError("INVALID_INPUT");
    const action = field(data, "action");
    const db = adminDatabase();
    const target = checkedUuid(field(data, "targetId"));
    if (action === "approve" || action === "disable") {
      await db.changeStatus(identity, target, action === "approve" ? "APPROVED" : "DISABLED");
    } else if (action === "assign" || action === "remove") {
      await db.changeUserRole(
        identity,
        target,
        checkedUuid(field(data, "roleId")),
        action === "assign",
      );
    } else if (action === "permissions") {
      const values = data.getAll("permissions");
      if (
        values.some(
          (value) => typeof value !== "string" || !permissionKeys.includes(value as Permission),
        )
      )
        throw new AccessError("INVALID_INPUT");
      await db.updateRolePermissions(identity, target, values as Permission[]);
    } else throw new AccessError("INVALID_INPUT");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Promjena je sačuvana i zabilježena u audit log." };
  } catch (error) {
    if (error instanceof AccessError) {
      const messages = {
        UNAUTHENTICATED: "Prijavite se ponovo.",
        FORBIDDEN: "Nemate dozvolu za ovu radnju.",
        INVALID_INPUT: "Provjerite unesene podatke i potvrdite radnju.",
        LAST_SUPERADMIN: "Posljednjem aktivnom superadministratoru nije moguće ukloniti pristup.",
        SELF_CHANGE: "Vlastiti status i vlastite uloge ne možete mijenjati.",
      };
      return { ok: false, message: messages[error.code] };
    }
    console.error("Admin promjena: operacija nije uspjela.");
    return { ok: false, message: "Promjena nije sačuvana. Pokušajte ponovo kasnije." };
  }
}
