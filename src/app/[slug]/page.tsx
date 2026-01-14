import { notFound } from "next/navigation";
import { getAllDocSlugs, getDocContent } from "@/lib/docs-server";
import { DOCS } from "@/lib/docs";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TableOfContents } from "@/components/TableOfContents";
import { PageNavigation } from "@/components/PageNavigation";
import { ChecklistManager } from "@/components/ChecklistManager";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllDocSlugs();
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const content = getDocContent(slug);

  if (!content) {
    notFound();
  }

  // Extract headings
  const headingMatches = content.matchAll(/^(#{2,3})\s+(.+)$/gm);
  const headings = Array.from(headingMatches).map((match) => ({
    id: match[2]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    text: match[2],
    level: match[1].length,
  }));

  const currentIndex = DOCS.findIndex((d) => d.id === slug);
  const prevDoc = currentIndex > 0 ? DOCS[currentIndex - 1] : null;
  const nextDoc =
    currentIndex < DOCS.length - 1 ? DOCS[currentIndex + 1] : null;

  // Check if this is the review checklist page
  const isChecklistPage = slug === "18-review-checklist";

  return (
    <>
      <main className="main-content" id="main-content">
        <article className="content">
          {isChecklistPage ? (
            <ChecklistManager content={content} />
          ) : (
            <MarkdownContent content={content} />
          )}
        </article>
        <PageNavigation
          prevDoc={prevDoc}
          nextDoc={nextDoc}
          // We need a client wrapper for navigation or just use Link in PageNavigation
          // PageNavigation uses a callback `onNavigate` which calls loadDocument (client state).
          // We need to refactor PageNavigation to use href links instead of onClick.
          // Since we are moving to standard routing, PageNavigation should use Next.js <Link>.
        />
      </main>
      <TableOfContents headings={headings} />
    </>
  );
}
