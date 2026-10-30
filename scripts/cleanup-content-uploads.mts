import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
const candidates: { bucket: string; path: string }[] = [];
async function inspect(bucket: string, prefix = "") {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error || !data) throw new Error("Storage listing failed; no files removed.");
    for (const file of data) {
      const path = prefix ? `${prefix}/${file.name}` : file.name;
      if (!file.id) {
        await inspect(bucket, path);
        continue;
      }
      const time = Date.parse(file.updated_at || file.created_at || "");
      if (!Number.isFinite(time) || time >= cutoff) continue;
      if (bucket === "candidate-files") {
        const refs = await client
          .from("candidate_applications")
          .select("id", { count: "exact", head: true })
          .contains("attachments", [{ path }]);
        if (refs.error) throw new Error("Reference check failed; no files removed.");
        if (refs.count !== 0) continue;
      }
      candidates.push({ bucket, path });
    }
    if (data.length < 100) break;
  }
}
await inspect("candidate-files");
await inspect("upload-staging");
console.log(`Found ${candidates.length} unreferenced private uploads older than 24 hours.`);
if (process.argv.includes("--apply")) {
  for (const file of candidates) {
    // A second reference check immediately before deletion protects a saved candidate.
    if (file.bucket === "candidate-files") {
      const refs = await client
        .from("candidate_applications")
        .select("id", { count: "exact", head: true })
        .contains("attachments", [{ path: file.path }]);
      if (refs.error) throw new Error("Reference recheck failed.");
      if (refs.count !== 0) continue;
    }
    const { error } = await client.storage.from(file.bucket).remove([file.path]);
    if (error) throw new Error("Cleanup incomplete; retry after inspecting Storage.");
  }
  console.log("Cleanup completed; candidate records and referenced attachments were preserved.");
} else console.log("Plan only. Pass --apply to remove these orphan uploads.");
