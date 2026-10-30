import { notFound } from "next/navigation";
import { publishedEntries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
import { ContentDetail } from "@/components/content-detail";
import { canonicalContentAlias } from "@/lib/content-alias";
export const revalidate = 60;
export async function generateStaticParams() {
  return (await publishedEntries("news")).map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  canonicalContentAlias(`/novosti/${slug}`);
  const e = (await publishedEntries("news", { slug, limit: 1, full: true }))[0];
  if (!e) notFound();
  return pageMetadata(
    e.title,
    (e.summary.length > 40 ? e.summary : "") ||
      `PennyPlus: ${e.title}. Pročitajte detalje naše objave i korisne informacije za kupce.`,
    `/novosti/${slug}`,
  );
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ContentDetail kind="news" slug={slug} />;
}
