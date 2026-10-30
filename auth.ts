import "server-only";
import NextAuth from "next-auth";
import { authEnvironment } from "@/lib/admin/config";
import { buildAuthConfig } from "@/lib/admin/auth-config";
import { adminDatabase } from "@/lib/admin/database";

export const { handlers, auth, signIn, signOut } = NextAuth(() =>
  buildAuthConfig(authEnvironment(), adminDatabase),
);
