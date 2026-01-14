"use client";

import Link from "next/link";
import { type Doc } from "@/lib/docs";

interface SidebarProps {
  docs: Doc[];
  currentDoc: string;
  isOpen: boolean;
  onLinkClick?: () => void;
}

export function Sidebar({
  docs,
  currentDoc,
  isOpen,
  onLinkClick,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onLinkClick}
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <nav className="nav-section">
          <div className="nav-section-title">Documentation</div>
          <ul className="nav-list">
            {docs.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/${doc.id}`}
                  onClick={onLinkClick}
                  className={`nav-link w-full text-left ${
                    currentDoc === doc.id ? "active" : ""
                  }`}
                >
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
