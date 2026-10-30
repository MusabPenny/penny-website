import { requireApiPermission } from "@/lib/admin/access";
import { adminDatabase } from "@/lib/admin/database";
import { AccessError } from "@/lib/admin/policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const actor = await requireApiPermission("users.read");
    const { users, total } = await adminDatabase(actor).users();
    return Response.json(
      {
        total,
        users: users.map(({ id, display_name, email, status, roles, last_login_at }) => ({
          id,
          display_name,
          email,
          status,
          roles,
          last_login_at,
        })),
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      const status = error.code === "UNAUTHENTICATED" ? 401 : 403;
      return Response.json(
        { error: status === 401 ? "Potrebna je prijava." : "Nemate dozvolu za ovu radnju." },
        { status, headers },
      );
    }
    console.error("Admin API: usluga trenutno nije dostupna.");
    return Response.json({ error: "Usluga trenutno nije dostupna." }, { status: 503, headers });
  }
}
