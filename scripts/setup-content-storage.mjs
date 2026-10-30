import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
for (const [id, isPublic, max, mimes] of [
  ["site-assets", true, 10485760, ["application/pdf", "image/webp", "image/png", "image/jpeg"]],
  [
    "candidate-files",
    false,
    3145728,
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  ],
  ["upload-staging", false, 10485760, ["application/pdf", "image/webp", "image/png", "image/jpeg"]],
]) {
  const { data, error } = await client.storage.getBucket(id);
  if (data) {
    if (data.public !== isPublic) throw new Error(`Privacy mismatch: ${id}`);
    console.log(`Verified: ${id} (${isPublic ? "public" : "private"})`);
    continue;
  }
  if (error && !["400", "404"].includes(String(error.statusCode)))
    throw new Error(`Storage unavailable: ${id}`);
  const result = await client.storage.createBucket(id, {
    public: isPublic,
    fileSizeLimit: max,
    allowedMimeTypes: mimes,
  });
  if (result.error) throw new Error(`Storage setup failed: ${id}`);
  console.log(`Created: ${id} (${isPublic ? "public" : "private"})`);
}
