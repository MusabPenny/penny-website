import { createHash, createHmac, randomUUID } from "node:crypto";
import { validateApplication } from "@/lib/application-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationBucket } from "@/lib/cms-types";
import { signReceipt } from "@/lib/upload-receipt";
import { smallJson } from "@/lib/request-json";
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== new URL(request.url).host)
      return Response.json({ error: "Nedozvoljen zahtjev." }, { status: 403 });
    const input = (await smallJson(request)) as {
      kind: "job" | "internship";
      fields: Record<string, string>;
      files: { name: string; size: number; slot: string }[];
    };
    if (
      !["job", "internship"].includes(input.kind) ||
      !Array.isArray(input.files) ||
      input.files.length > 3 ||
      JSON.stringify(input).length > 60000
    )
      throw new Error("Provjerite prijavu.");
    const data = new FormData();
    for (const [k, v] of Object.entries(input.fields ?? {})) {
      if (typeof v !== "string") throw new Error("Provjerite prijavu.");
      data.set(k, v);
    }
    if (data.get("website")) throw new Error("Prijava nije poslana.");
    const answers = validateApplication(data, input.kind);
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("CONFIGURATION");
    const client = createAdminClient();
    const limit = await client.rpc("penny_form_reserve", {
      p_key: createHmac("sha256", secret).update(answers.email.toLowerCase()).digest("hex"),
    });
    if (limit.error) throw new Error("Previše pokušaja. Pokušajte kasnije.");
    const id = randomUUID();
    const files: { path: string; name: string; size: number; slot: string; url: string }[] = [];
    for (const f of input.files) {
      const ext = typeof f.name === "string" ? (f.name.split(".").pop()?.toLowerCase() ?? "") : "";
      if (
        !["pdf", "doc", "docx"].includes(ext) ||
        typeof f.size !== "number" ||
        f.size <= 0 ||
        f.size > 3 * 1024 * 1024 ||
        !(input.kind === "job" ? ["cv"] : ["cv", "motivation_file", "other_file"]).includes(
          f.slot,
        ) ||
        files.some((a) => a.slot === f.slot)
      )
        throw new Error("Provjerite priloge (PDF, DOC ili DOCX, do 3 MB).");
      const path = `${id}/${f.slot}.${ext}`;
      const { data: ticket, error } = await client.storage
        .from(applicationBucket)
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !ticket) throw new Error("Upload nije dostupan.");
      files.push({
        path,
        name: f.name.slice(0, 160),
        size: f.size,
        slot: f.slot,
        url: ticket.signedUrl,
      });
    }
    const hash = createHash("sha256")
      .update(JSON.stringify({ answers, kind: input.kind, job_id: data.get("job_id") ?? "" }))
      .digest("hex");
    return Response.json(
      {
        files,
        receipt: signReceipt({
          id,
          hash,
          files: files.map(({ path, name, size, slot }) => ({ path, name, size, slot })),
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return Response.json(
      {
        error: /^(Provjerite|Potvrdite|Potrebna|Previše|Upload|Prijava|Dopunite)/.test(msg)
          ? msg
          : "Prijava trenutno nije dostupna.",
      },
      { status: 400 },
    );
  }
}
