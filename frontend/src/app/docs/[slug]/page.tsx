import { notFound } from "next/navigation";

import { getDoc, listDocs } from "@/lib/docs";

export function generateStaticParams() {
  return listDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return { title: doc ? `${doc.title} · StreamLine Docs` : "Docs · StreamLine" };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  return (
    <article
      className="doc-prose"
      dangerouslySetInnerHTML={{ __html: doc.html }}
    />
  );
}
