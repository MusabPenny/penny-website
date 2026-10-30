import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminRepository } from "./repository";
import type { AppUser } from "./policy";

export function adminDatabase(user?: AppUser) {
  return new AdminRepository(
    createAdminClient(),
    user ? { tenantId: user.tenant_id, objectId: user.object_id } : null,
  );
}
