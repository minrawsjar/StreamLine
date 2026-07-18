import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

/**
 * Docs are plain Markdown in `src/content/docs/` (copied from the repo `docs/`
 * so Vercel bundles them). Read at build time → static pages. Trusted, authored
 * content, so rendered HTML is injected directly.
 */
const DOCS_DIR = path.join(process.cwd(), "src/content/docs");

// README/overview first, then alphabetical by title.
const PRIORITY = ["README"];

export type DocMeta = { slug: string; title: string };

function titleOf(slug: string, md: string): string {
  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function listDocs(): DocMeta[] {
  return readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      return { slug, title: titleOf(slug, readFileSync(path.join(DOCS_DIR, f), "utf8")) };
    })
    .sort((a, b) => {
      const pa = PRIORITY.indexOf(a.slug);
      const pb = PRIORITY.indexOf(b.slug);
      if (pa !== -1 || pb !== -1)
        return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      return a.title.localeCompare(b.title);
    });
}

export function getDoc(slug: string): { title: string; html: string } | null {
  try {
    const md = readFileSync(path.join(DOCS_DIR, `${slug}.md`), "utf8");
    return { title: titleOf(slug, md), html: marked.parse(md) as string };
  } catch {
    return null;
  }
}
