import { notFound } from "next/navigation";
import { getAllDocSlugs, getDocContent } from "@/lib/docs-server";
import { DOCS } from "@/lib/docs";
import { ServerMarkdownContent } from "@/components/ServerMarkdownContent";
import { TableOfContents } from "@/components/TableOfContents";
import { PageNavigation } from "@/components/PageNavigation";
import { ChecklistManager } from "@/components/ChecklistManager";
import { parseMarkdown } from "@/lib/markdown";

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

  // Parse markdown on server and extract headings
  const { headings } = await parseMarkdown(content);

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
            <ServerMarkdownContent content={content} />
          )}
        </article>
        <PageNavigation prevDoc={prevDoc} nextDoc={nextDoc} />
      </main>
      <TableOfContents headings={headings} />
    </>
  );
}
