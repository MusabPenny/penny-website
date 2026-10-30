import type { NextAuthConfig } from "next-auth";
import type { authEnvironment } from "./config";
import type { AdminRepository } from "./repository";
import { verifyEntraIdToken } from "./entra";

export function buildAuthConfig(
  config: ReturnType<typeof authEnvironment>,
  getDatabase: () => AdminRepository,
  verifyToken = verifyEntraIdToken,
) {
  return {
    secret: config.secret,
    // AUTH_URL fixes the canonical host. Vercel is a trusted platform proxy;
    // never enable trustHost merely because an arbitrary header is present.
    trustHost:
      Boolean(process.env.AUTH_URL) ||
      process.env.VERCEL === "1" ||
      process.env.NODE_ENV !== "production",
    useSecureCookies: process.env.NODE_ENV === "production",
    session: { strategy: "jwt", maxAge: 3600 },
    pages: { signIn: "/admin/login", error: "/admin/login" },
    debug: false,
    logger: {
      error(error) {
        console.error(
          "Auth.js:",
          "type" in error && typeof error.type === "string" ? error.type : "AuthError",
        );
      },
      warn(code) {
        console.warn("Auth.js:", code);
      },
      debug() {},
    },
    providers: [
      {
        id: "microsoft-entra-id",
        name: "Microsoft Entra ID",
        type: "oidc",
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        issuer: config.issuer,
        authorization: {
          params: { scope: "openid profile email", response_type: "code", response_mode: "query" },
        },
        checks: ["pkce", "state", "nonce"],
        idToken: true,
        async profile(_profile, tokens) {
          try {
            if (typeof tokens.id_token !== "string") throw new Error("Missing ID token");
            const identity = await verifyToken(tokens.id_token, config);
            // Auth.js passes raw OIDC claims as callbacks.profile. This mapped
            // object is instead reliably available as callbacks.user (no adapter).
            return {
              id: `${identity.tenantId}:${identity.objectId}`,
              name: identity.displayName,
              email: identity.email,
              image: null,
              entraIdentity: identity,
            };
          } catch {
            try {
              await getDatabase().deniedLogin();
            } catch {
              console.error("Admin audit: prijava nije zabilježena.");
            }
            throw new Error("Entra identity rejected");
          }
        },
      },
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider !== "microsoft-entra-id" || !user.entraIdentity) return false;
        const appUser = await getDatabase().registerLogin(user.entraIdentity);
        if (appUser.status === "DISABLED") return "/admin/pristup-odbijen";
        // PENDING identities receive only a restricted app session so they can
        // see their waiting screen. Every data route checks APPROVED in SQL.
        return true;
      },
      async jwt({ token, user, account }) {
        if (account) {
          const identity = user?.entraIdentity;
          if (!identity || account.provider !== "microsoft-entra-id") return null;
          return {
            sub: `${identity.tenantId}:${identity.objectId}`,
            tenantId: identity.tenantId,
            objectId: identity.objectId,
            identityExpiresAt: identity.expiresAt,
          };
        }
        // Ignore client-supplied session updates. Absolute lifetime cannot be
        // extended by Auth.js cookie renewal or repeated calls to /session.
        if (
          typeof token.tenantId !== "string" ||
          typeof token.objectId !== "string" ||
          typeof token.identityExpiresAt !== "number" ||
          token.identityExpiresAt <= Date.now() / 1000
        )
          return null;
        return token;
      },
      session({ session, token }) {
        session.user.id = String(token.sub);
        session.user.name = null;
        session.user.email = "";
        session.user.image = null;
        session.identity = {
          tenantId: String(token.tenantId),
          objectId: String(token.objectId),
          expiresAt: Number(token.identityExpiresAt),
        };
        return session;
      },
      redirect({ url, baseUrl }) {
        const target = new URL(url, baseUrl);
        return target.origin === baseUrl && target.pathname.startsWith("/admin")
          ? target.href
          : `${baseUrl}/admin`;
      },
    },
    events: {
      async signOut(message) {
        if (
          "token" in message &&
          typeof message.token?.tenantId === "string" &&
          typeof message.token.objectId === "string"
        ) {
          try {
            await getDatabase().logout({
              tenantId: message.token.tenantId,
              objectId: message.token.objectId,
            });
          } catch {
            console.error("Admin audit: odjava nije zabilježena.");
          }
        }
      },
    },
  } satisfies NextAuthConfig;
}
