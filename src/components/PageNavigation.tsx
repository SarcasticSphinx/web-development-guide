import Link from "next/link";
import { type Doc } from "@/lib/docs";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface PageNavigationProps {
  prevDoc: Doc | null;
  nextDoc: Doc | null;
}

export function PageNavigation({ prevDoc, nextDoc }: PageNavigationProps) {
  return (
    <nav className="page-nav">
      {prevDoc ? (
        <Link href={`/${prevDoc.id}`} className="page-nav-link prev">
          <span className="page-nav-direction">
            <IconChevronLeft
              size={12}
              style={{ display: "inline-block", marginRight: "4px" }}
            />
            Previous
          </span>
          <span className="page-nav-title">{prevDoc.title}</span>
        </Link>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {nextDoc ? (
        <Link href={`/${nextDoc.id}`} className="page-nav-link next">
          <span className="page-nav-direction">
            Next
            <IconChevronRight
              size={12}
              style={{ display: "inline-block", marginLeft: "4px" }}
            />
          </span>
          <span className="page-nav-title">{nextDoc.title}</span>
        </Link>
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </nav>
  );
}
