"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SearchModal } from "@/components/SearchModal";
import { DOCS } from "@/lib/docs";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
          docs={DOCS}
          onClose={() => setSearchOpen(false)}
          onDocSelect={(docId) => {
            handleDocSelect(docId);
            setSearchOpen(false);
          }}
        />
      )}
    </>
  );
}
