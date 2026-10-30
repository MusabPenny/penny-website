import { notFound } from "next/navigation";
import { publishedEntries } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";
import { ContentDetail } from "@/components/content-detail";
export const revalidate = 60;
export async function generateStaticParams() {
  return (await publishedEntries("promotion")).map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = (await publishedEntries("promotion", { slug, limit: 1, full: true }))[0];
  if (!e) notFound();
  return pageMetadata(
    e.title,
    e.summary ||
      `PennyPlus: ${e.title}. Pročitajte detalje naše objave i korisne informacije za kupce.`,
    `/akcije/${slug}`,
  );
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ContentDetail kind="promotion" slug={slug} />;
}
