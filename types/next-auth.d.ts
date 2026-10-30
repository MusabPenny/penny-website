import type { DefaultSession } from "next-auth";
import "next-auth/jwt";
import type { LoginIdentity } from "@/lib/admin/policy";

declare module "next-auth" {
  interface User {
    entraIdentity?: LoginIdentity;
  }
  interface Session {
    user: DefaultSession["user"] & { id: string };
    identity?: { tenantId: string; objectId: string; expiresAt: number };
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    objectId?: string;
    identityExpiresAt?: number;
  }
}
