import { timingSafeEqual } from "node:crypto";
import { processMailQueue } from "@/lib/recruitment-mail";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await processMailQueue(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Obrada reda trenutno nije dostupna." }, { status: 503 });
  }
}
