import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { identityFromClaims } from "./policy";
import type { authEnvironment } from "./config";

type EntraConfig = ReturnType<typeof authEnvironment>;
const keySets = new Map<string, JWTVerifyGetKey>();
export async function verifyEntraIdToken(
  idToken: string,
  config: EntraConfig,
  testKeySet?: JWTVerifyGetKey,
) {
  let keys = testKeySet ?? keySets.get(config.tenantId);
  if (!keys) {
    keys = createRemoteJWKSet(
      new URL(`https://login.microsoftonline.com/${config.tenantId}/discovery/v2.0/keys`),
    );
    keySets.set(config.tenantId, keys);
  }
  const { payload } = await jwtVerify(idToken, keys, {
    algorithms: ["RS256"],
    issuer: config.issuer,
    audience: config.clientId,
    requiredClaims: ["exp", "iat", "sub", "tid", "oid", "nonce"],
    clockTolerance: 5,
    maxTokenAge: "1h",
  });
  return identityFromClaims(payload, config.tenantId, config.accessRole);
}
