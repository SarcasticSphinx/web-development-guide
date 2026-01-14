"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { IconX } from "@tabler/icons-react";

interface TableOfContentsProps {
  headings: { id: string; text: string; level: number }[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      // Create intersection observer to track which heading is in view
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        {
          rootMargin: "-140px 0px -80% 0px",
          threshold: 0,
        }
      );

      // Observe all headings
      const headingElements = headings
        .map((h) => document.getElementById(h.id))
        .filter(Boolean) as HTMLElement[];

      headingElements.forEach((el) => {
        observerRef.current?.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
    };
  }, [headings]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveId(id);
      setIsOpen(false);
    }
  };

  if (headings.length === 0) return null;

  return (
    <>
      <button
        className="toc-toggle-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Table of Contents"
      >
        Table of Contents
      </button>

      {isOpen && (
        <div className="toc-overlay" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`toc ${isOpen ? "open" : ""}`} id="toc">
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <h3 className="toc-title">On this page</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors text-[var(--color-text)]"
            aria-label="Close table of contents"
          >
            <IconX size={18} />
          </button>
        </div>

        <h3 className="toc-title hidden lg:block">On this page</h3>
        <nav aria-label="Table of contents">
          <ul className="toc-list">
            {headings.map((heading, index) => (
              <li key={`${heading.id}-${index}`}>
                <Link
                  href={`#${heading.id}`}
                  className={`${heading.level === 3 ? "toc-h3" : ""} ${
                    activeId === heading.id ? "active" : ""
                  }`}
                  onClick={(e) => handleClick(e, heading.id)}
                >
                  {heading.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
