"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { type Doc } from "@/lib/docs";
import { IconSearch, IconX, IconFileText } from "@tabler/icons-react";
import { createPortal } from "react-dom";

interface SearchModalProps {
  docs: Doc[];
  onClose: () => void;
  onDocSelect: (docId: string) => void;
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

  const filteredDocs = useMemo(() => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    return docs.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.id.toLowerCase().includes(lowerQuery)
    );
  }, [docs, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredDocs.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedDoc = filteredDocs[selectedIndex];
      if (selectedDoc) {
        onDocSelect(selectedDoc.id);
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
            placeholder="Search documentation..."
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
          {filteredDocs.length > 0 ? (
            <div className="search-results-list">
              {filteredDocs.map((doc, index) => (
                <div
                  key={doc.id}
                  onClick={() => onDocSelect(doc.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`search-result ${
                    index === selectedIndex ? "selected" : ""
                  }`}
                  role="button"
                >
                  <div className="search-result-title flex items-center gap-2">
                    <IconFileText size={16} style={{ opacity: 0.7 }} />
                    {doc.title}
                  </div>
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="search-hint">No results found for &ldquo;{query}&rdquo;</div>
          ) : (
            <div className="search-hint">Type to search...</div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
