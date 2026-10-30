export const contentKinds = ["job", "news", "catalog", "promotion", "document", "partner"] as const;
export type ContentKind = (typeof contentKinds)[number];
export const kindLabels: Record<ContentKind, string> = {
  job: "Oglasi za posao",
  news: "Novosti",
  catalog: "Katalozi",
  promotion: "Akcije",
  document: "Dokumenti",
  partner: "Partneri",
};
export type Entry = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string;
  body: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  starts_at: string;
  ends_at: string | null;
  asset_path: string | null;
  asset_name: string | null;
  asset_mime: string | null;
  source_url: string | null;
  location: string;
  created_at: string;
  updated_at: string;
};
export const applicationStatuses = {
  NEW: "Nova",
  REVIEWING: "U obradi",
  SHORTLISTED: "Uži izbor",
  ACCEPTED: "Prihvaćena",
  REJECTED: "Odbijena",
} as const;
export type ApplicationStatus = keyof typeof applicationStatuses;
export type Attachment = { path: string; name: string; mime: string; size: number; slot: string };
export type Application = {
  id: string;
  kind: "job" | "internship";
  job_id: string | null;
  job_title: string;
  first_name: string;
  last_name: string;
  email: string;
  answers: Record<string, string>;
  attachments: Attachment[];
  status: ApplicationStatus;
  notes: string;
  created_at: string;
};
export const assetBucket = "site-assets";
export const applicationBucket = "candidate-files";
export function assetUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${assetBucket}/${path}`;
}
