import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
export const teamBucket = "team-photos";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Team storage requires Supabase URL and server secret.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
export const teamStorage = client.storage.from(teamBucket);

export async function ensureTeamBucket() {
  const { data, error } = await client.storage.getBucket(teamBucket);
  if (error && !["404", "400"].includes(String(error.statusCode))) throw error;
  if (data) {
    if (!data.public) throw new Error("Team photo bucket must be public.");
    return;
  }
  const result = await client.storage.createBucket(teamBucket, {
    public: true,
    allowedMimeTypes: ["image/webp"],
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (result.error) throw result.error;
}

export async function storeTeamPhoto(filename, bytes) {
  if (!/^[a-f0-9]{16}\.webp$/.test(filename)) throw new Error("Invalid team photo filename.");
  const { error } = await teamStorage.upload(filename, bytes, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error && String(error.statusCode) !== "409") throw error;
  const src = teamStorage.getPublicUrl(filename).data.publicUrl;
  const response = await fetch(src, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(bytes))
    throw new Error(`Public team photo verification failed: ${filename}`);
  return src;
}
