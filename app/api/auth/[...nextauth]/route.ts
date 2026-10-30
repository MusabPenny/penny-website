import { handlers } from "@/auth";
import { missingAdminEnvironment } from "@/lib/admin/config";
import type { NextRequest } from "next/server";

async function handle(request: NextRequest) {
  if (missingAdminEnvironment().length) {
    console.error("Admin konfiguracija: nedostaju " + missingAdminEnvironment().join(", "));
    return Response.json(
      { error: "Prijava trenutno nije dostupna. Obratite se administratoru." },
      { status: 503 },
    );
  }
  return handlers[request.method === "POST" ? "POST" : "GET"](request);
}
export const GET = handle;
export const POST = handle;
export const runtime = "nodejs";
