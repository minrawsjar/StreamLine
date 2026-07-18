import Link from "next/link";

import { listDocs } from "@/lib/docs";
import "./docs.css";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = listDocs();
  return (
    <div className="docs-root">
      <header className="docs-header">
        <Link href="/" className="docs-brand">
          StreamLine
        </Link>
        <Link href="/app" className="docs-back">
          Open app →
        </Link>
      </header>
      <div className="docs-body">
        <aside className="docs-sidebar">
          <p className="docs-sidebar-title">Docs</p>
          <nav>
            {docs.map((d) => (
              <Link key={d.slug} href={`/docs/${d.slug}`}>
                {d.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="docs-main">{children}</main>
      </div>
    </div>
  );
}
