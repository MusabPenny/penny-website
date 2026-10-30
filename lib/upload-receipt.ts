import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
function signature(body: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Missing upload signing key");
  return createHmac("sha256", secret).update(body).digest("base64url");
}
export function signReceipt(payload: Record<string, unknown>) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, expires: Date.now() + 20 * 60 * 1000 }),
  ).toString("base64url");
  return `${body}.${signature(body)}`;
}
export function readReceipt<T>(receipt: string): T {
  const [body, sig] = receipt.split(".");
  if (!body || !sig) throw new Error("Neispravan upload token.");
  const expected = signature(body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    throw new Error("Neispravan upload token.");
  const data = JSON.parse(Buffer.from(body, "base64url").toString());
  if (typeof data.expires !== "number" || data.expires < Date.now())
    throw new Error("Upload je istekao. Odaberite fajl ponovo.");
  return data as T;
}
