"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SearchModal } from "@/components/SearchModal";
import { DOCS, type DocWithContent } from "@/lib/docs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface ClientShellProps {
  children: React.ReactNode;
  docsWithContent: DocWithContent[];
}

export function ClientShell({ children, docsWithContent }: ClientShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Extract current doc ID from pathname
  // Pathname will be like "/01-introduction" or "/"
  const currentDoc = pathname === "/" ? "01-introduction" : pathname.slice(1);

  useEffect(() => {
    const savedTheme = localStorage.getItem("envato-docs-theme") as
      | "light"
      | "dark"
      | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("envato-docs-theme", newTheme);
  };

  const handleDocSelect = (docId: string) => {
    router.push(`/${docId}`);
    setSidebarOpen(false);
  };

  // Highlight and scroll to search matches
  const highlightSearchMatches = useCallback((searchQuery: string) => {
    // Wait for content to render
    setTimeout(() => {
      const contentEl = document.querySelector(".content.server-markdown");
      if (!contentEl) return;

      // Remove any existing highlights
      document.querySelectorAll(".search-match-highlight").forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(
            document.createTextNode(el.textContent || ""),
            el
          );
          parent.normalize();
        }
      });

      // Find and highlight matches in text nodes
      const walker = document.createTreeWalker(
        contentEl,
        NodeFilter.SHOW_TEXT,
        null
      );

      const matches: { node: Text; index: number }[] = [];
      let node: Text | null;

      while ((node = walker.nextNode() as Text)) {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerQuery = searchQuery.toLowerCase();
        let index = lowerText.indexOf(lowerQuery);

        while (index !== -1) {
          matches.push({ node, index });
          index = lowerText.indexOf(lowerQuery, index + 1);
        }
      }

      // Highlight first match and scroll to it
      if (matches.length > 0) {
        const firstMatch = matches[0];
        const { node: textNode, index } = firstMatch;
        const text = textNode.textContent || "";

        const before = text.slice(0, index);
        const match = text.slice(index, index + searchQuery.length);
        const after = text.slice(index + searchQuery.length);

        const span = document.createElement("span");
        span.className = "search-match-highlight";
        span.textContent = match;

        const parent = textNode.parentNode;
        if (parent) {
          const beforeNode = document.createTextNode(before);
          const afterNode = document.createTextNode(after);

          parent.insertBefore(beforeNode, textNode);
          parent.insertBefore(span, textNode);
          parent.insertBefore(afterNode, textNode);
          parent.removeChild(textNode);

          // Scroll to the highlighted match
          span.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      // Clear highlight after 5 seconds
      setTimeout(() => {
        document.querySelectorAll(".search-match-highlight").forEach((el) => {
          el.classList.add("fade-out");
          setTimeout(() => {
            const parent = el.parentNode;
            if (parent) {
              parent.replaceChild(
                document.createTextNode(el.textContent || ""),
                el
              );
              parent.normalize();
            }
          }, 500);
        });
      }, 5000);
    }, 300);
  }, []);

  // Handle pending highlight after navigation
  useEffect(() => {
    if (pendingHighlight) {
      highlightSearchMatches(pendingHighlight);
      setPendingHighlight(null);
    }
  }, [pathname, pendingHighlight, highlightSearchMatches]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Link href="#main-content" className="skip-link">
        Skip to main content
      </Link>

      <Header
        theme={theme}
        onThemeToggle={toggleTheme}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="main-layout">
        <Sidebar
          docs={DOCS}
          currentDoc={currentDoc}
          isOpen={sidebarOpen}
          onLinkClick={() => setSidebarOpen(false)}
        />
        {children}
      </div>

      {searchOpen && (
        <SearchModal
          docs={docsWithContent}
          onClose={() => setSearchOpen(false)}
          onDocSelect={(docId, anchor, searchQuery) => {
            const url = anchor ? `/${docId}#${anchor}` : `/${docId}`;
            router.push(url);
            setSidebarOpen(false);
            setSearchOpen(false);

            // Set pending highlight to be applied after navigation
            if (searchQuery) {
              setPendingHighlight(searchQuery);
            }
          }}
        />
      )}
    </>
  );
}
