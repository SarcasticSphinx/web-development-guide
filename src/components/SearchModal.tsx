"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { type DocWithContent } from "@/lib/docs";
import { IconSearch, IconX, IconFileText } from "@tabler/icons-react";
import { createPortal } from "react-dom";

interface SearchResult {
  doc: DocWithContent;
  matchType: "title" | "content";
  snippet?: string;
  matchCount: number;
  nearestHeadingId?: string;
  searchQuery: string;
}

interface SearchModalProps {
  docs: DocWithContent[];
  onClose: () => void;
  onDocSelect: (docId: string, anchor?: string, searchQuery?: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findNearestHeading(
  content: string,
  query: string
): string | undefined {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) return undefined;

  // Find all headings in the content before the match
  const contentBeforeMatch = content.slice(0, matchIndex);
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let lastHeading: string | undefined;
  let match;

  while ((match = headingRegex.exec(contentBeforeMatch)) !== null) {
    lastHeading = match[1].trim();
  }

  if (lastHeading) {
    return slugify(lastHeading);
  }

  // If no heading found before match, find the first heading in the document
  headingRegex.lastIndex = 0;
  const firstMatch = headingRegex.exec(content);
  if (firstMatch) {
    return slugify(firstMatch[1].trim());
  }

  return undefined;
}

function getSnippet(
  content: string,
  query: string,
  maxLength: number = 150
): string {
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerContent.indexOf(lowerQuery);

  if (index === -1) return "";

  // Find start position (try to start at a word boundary)
  let start = Math.max(0, index - 50);
  if (start > 0) {
    const spaceIndex = content.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < index) {
      start = spaceIndex + 1;
    }
  }

  // Find end position
  let end = Math.min(content.length, index + query.length + 100);
  if (end < content.length) {
    const spaceIndex = content.lastIndexOf(" ", end);
    if (spaceIndex > index + query.length) {
      end = spaceIndex;
    }
  }

  let snippet = content.slice(start, end);

  // Add ellipsis if needed
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

function countMatches(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
    count++;
    pos += lowerQuery.length;
  }
  return count;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);
  let key = 0;

  while (index !== -1) {
    if (index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, index)}</span>);
    }
    parts.push(
      <mark key={key++} className="search-highlight">
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

export function SearchModal({ docs, onClose, onDocSelect }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const searchResults = useMemo((): SearchResult[] => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const doc of docs) {
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const contentMatch = doc.content.toLowerCase().includes(lowerQuery);

      if (titleMatch || contentMatch) {
        const matchCount =
          countMatches(doc.title, query) + countMatches(doc.content, query);

        const nearestHeadingId = contentMatch
          ? findNearestHeading(doc.content, query)
          : undefined;

        results.push({
          doc,
          matchType: titleMatch ? "title" : "content",
          snippet: contentMatch ? getSnippet(doc.content, query) : undefined,
          matchCount,
          nearestHeadingId,
          searchQuery: query,
        });
      }
    }

    // Sort by match count (more matches = higher priority)
    results.sort((a, b) => {
      // Title matches first
      if (a.matchType === "title" && b.matchType !== "title") return -1;
      if (b.matchType === "title" && a.matchType !== "title") return 1;
      // Then by match count
      return b.matchCount - a.matchCount;
    });

    return results;
  }, [docs, query]);

  const handleResultSelect = (result: SearchResult) => {
    onDocSelect(result.doc.id, result.nearestHeadingId, result.searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedResult = searchResults[selectedIndex];
      if (selectedResult) {
        handleResultSelect(selectedResult);
      }
    }
  };

  return createPortal(
    <>
      <div className="search-modal-overlay" onClick={onClose} />
      <div className="search-modal">
        <div className="search-modal-header">
          <IconSearch size={20} style={{ color: "var(--color-text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search all documentation..."
            className="search-modal-input"
          />
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              display: "flex",
            }}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="search-results">
          {searchResults.length > 0 ? (
            <div className="search-results-list">
              {searchResults.map((result, index) => (
                <div
                  key={result.doc.id + index}
                  onClick={() => handleResultSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`search-result ${
                    index === selectedIndex ? "selected" : ""
                  }`}
                  role="button"
                >
                  <div className="search-result-title flex items-center gap-2">
                    <IconFileText size={16} style={{ opacity: 0.7 }} />
                    <span>{highlightMatch(result.doc.title, query)}</span>
                    <span className="search-result-section">
                      {result.doc.section}
                    </span>
                  </div>
                  {result.snippet && (
                    <div className="search-result-snippet">
                      {highlightMatch(result.snippet, query)}
                    </div>
                  )}
                  <div className="search-result-meta">
                    {result.matchCount} match
                    {result.matchCount !== 1 ? "es" : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : query && query.length >= 2 ? (
            <div className="search-hint">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : query ? (
            <div className="search-hint">
              Type at least 2 characters to search...
            </div>
          ) : (
            <div className="search-hint">
              Search across all documentation content...
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
