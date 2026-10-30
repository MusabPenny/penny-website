import { checkedUuid } from "./policy";

const authVariables = [
  "AUTH_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_TENANT_ID",
] as const;
export function missingAdminEnvironment() {
  return [
    ...authVariables,
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
  ].filter((name) => !process.env[name]?.trim());
}
export function authEnvironment() {
  const missing = authVariables.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Admin konfiguracija: nedostaju ${missing.join(", ")}.`);
  const secret = process.env.AUTH_SECRET!.trim();
  if (secret.length < 32)
    throw new Error("Admin konfiguracija: AUTH_SECRET mora imati najmanje 32 znaka.");
  const tenantId = checkedUuid(process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID);
  return {
    secret,
    tenantId,
    clientId: checkedUuid(process.env.AUTH_MICROSOFT_ENTRA_ID_ID),
    clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!.trim(),
    accessRole: process.env.ENTRA_ACCESS_ROLE?.trim() || "Portal.Access",
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  };
}
