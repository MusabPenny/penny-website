import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { AppUser } from "./admin/policy";
import type { ContentKind, Entry } from "./cms-types";
import { selectEntries } from "./admin/entry-list";

export async function contentAdmin<T>(
  user: AppUser,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await createAdminClient().rpc("penny_content_execute", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_action: action,
    p_payload: payload,
  });
  if (error) {
    if (["FORBIDDEN", "CONFLICT", "INVALID_INPUT"].includes(error.message))
      throw new Error(error.message);
    throw new Error("Sadržaj trenutno nije dostupan. Pokušajte ponovo.");
  }
  return data as T;
}

export async function publishedEntries(
  kind?: ContentKind,
  options: { slug?: string; limit?: number; offset?: number; full?: boolean } = {},
): Promise<Entry[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Nedostaje konfiguracija sadržaja.");
  const response = await fetch(`${url}/rest/v1/rpc/penny_read_entries`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_kind: kind ?? null,
      p_slug: options.slug ?? null,
      p_limit: options.limit ?? 500,
      p_offset: options.offset ?? 0,
      p_summary: !options.full,
    }),
    next: { revalidate: 60, tags: ["site-content"] },
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) {
    const legacy = await fetch(`${url}/rest/v1/rpc/penny_public_entries`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_kind: kind ?? null }),
      next: { revalidate: 60, tags: ["site-content"] },
    });
    if (!legacy.ok) throw new Error("Sadržaj trenutno nije dostupan.");
    const rows = (await legacy.json()) as Entry[];
    return rows
      .filter((e) => !options.slug || e.slug === options.slug)
      .slice(
        options.offset ?? 0,
        options.limit ? (options.offset ?? 0) + options.limit : undefined,
      );
  }
  if (!response.ok) throw new Error("Sadržaj trenutno nije dostupan.");
  const data = (await response.json()) as Entry[];
  if (options.limit === undefined && !options.slug && data.length === 500) {
    const rest: Entry[] = [];
    for (let offset = (options.offset ?? 0) + 500; ; offset += 500) {
      const page = await publishedEntries(kind, { ...options, limit: 500, offset });
      rest.push(...page);
      if (page.length < 500) break;
    }
    data.push(...rest);
  }
  // Recheck the clock even for cached rows: expired ads and offers must disappear.
  const now = Date.now();
  return data.filter(
    (e) => Date.parse(e.starts_at) <= now && (!e.ends_at || Date.parse(e.ends_at) > now),
  );
}

// Capture one request-time clock with the records so server and client render
// identical scheduled/expired labels, including during hydration.
export type EntryListParams = {
  query?: string;
  status?: string;
  sort?: string;
  page?: string;
  edit?: string;
};
export async function contentEntrySnapshot(
  user: AppUser,
  kind: ContentKind,
  params: EntryListParams = {},
) {
  const page = Math.max(1, Math.min(10000, Math.floor(Number(params.page) || 1)));
  const { data, error } = await createAdminClient().rpc("penny_browse_entries", {
    p_tenant_id: user.tenant_id,
    p_object_id: user.object_id,
    p_payload: {
      kind,
      query: params.query ?? "",
      status: params.status ?? "",
      sort: params.sort ?? "newest",
      page: params.edit ? 1 : page,
      id: params.edit ?? "",
    },
  });
  if (error && ["PGRST202", "42883"].includes(error.code)) {
    const all = await contentAdmin<Entry[]>(user, "entries", { kind });
    const matched = params.edit
      ? all.filter((e) => e.id === params.edit)
      : selectEntries(
          all,
          params.query ?? "",
          params.status ?? "",
          params.sort ?? "newest",
          Date.now(),
        );
    return {
      entries: params.edit
        ? matched
        : matched.slice((page - 1) * 10, page * 10).map((e) => ({ ...e, body: "" })),
      total: matched.length,
      missingDeadlines: all
        .filter((e) => e.status === "PUBLISHED" && !e.ends_at)
        .map(({ id, title }) => ({ id, title })),
      now: Date.now(),
      page,
      filters: params,
    };
  }
  if (error) throw new Error("Lista trenutno nije dostupna.");
  return {
    ...(data as {
      entries: Entry[];
      total: number;
      missingDeadlines: { id: string; title: string }[];
    }),
    now: Date.now(),
    page,
    filters: params,
  };
}
