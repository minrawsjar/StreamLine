import Link from "next/link";

import { listDocs } from "@/lib/docs";

export const metadata = { title: "Docs · StreamLine" };

export default function DocsIndex() {
  const docs = listDocs();
  return (
    <article className="doc-prose">
      <h1>StreamLine Docs</h1>
      <p>Architecture, privacy design, and build notes for StreamLine.</p>
      <div className="docs-index-cards">
        {docs.map((d) => (
          <Link key={d.slug} href={`/docs/${d.slug}`} className="docs-index-card">
            {d.title}
          </Link>
        ))}
      </div>
    </article>
  );
}
