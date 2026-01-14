"use client";

import { JSX, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCheck, X } from "lucide-react";

// Helper to parse inline markdown (links, bold, italic)
function parseInlineMarkdown(text: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let lastIndex = 0;
  let key = 0;

  // Match markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      elements.push(
        <span key={`text-${key++}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    const linkText = match[1];
    const href = match[2];

    // Create anchor link
    if (href.startsWith("#")) {
      elements.push(
        <a
          key={`link-${key++}`}
          href={href}
          className="text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            const element = document.getElementById(href.slice(1));
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          {linkText}
        </a>
      );
    } else {
      elements.push(
        <a
          key={`link-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = linkRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(<span key={`text-${key++}`}>{text.slice(lastIndex)}</span>);
  }

  return elements.length > 0 ? elements : [<span key="default">{text}</span>];
}

interface ChecklistItem {
  id: string;
  text: string;
  level: number;
  checked: boolean;
}

interface ChecklistManagerProps {
  content: string;
}

export function ChecklistManager({ content }: ChecklistManagerProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Parse markdown to extract checklist items
  useEffect(() => {
    if (!content) return;

    setMounted(true);

    const lines = content.split("\n");
    const checklistItems: ChecklistItem[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)- \[ \] (.+)$/);
      if (match) {
        const spaces = match[1].length;
        const level = Math.floor(spaces / 2);
        const text = match[2];
        // Create stable ID from text content
        const stableId = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        checklistItems.push({
          id: stableId || `item-${index}`,
          text,
          level,
          checked: false,
        });
      }
    });

    // Load saved state from localStorage (only on client)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("review-checklist-state");
      if (saved) {
        try {
          const savedState = JSON.parse(saved);
          checklistItems.forEach((item, idx) => {
            if (savedState[item.id] !== undefined) {
              checklistItems[idx].checked = savedState[item.id];
            }
          });
        } catch (e) {
          console.error("Failed to parse saved checklist state:", e);
        }
      }
    }

    setItems(checklistItems);
  }, [content]);

  // Save state to localStorage whenever items change
  useEffect(() => {
    if (!mounted || typeof window === "undefined" || items.length === 0) return;

    const state: Record<string, boolean> = {};
    items.forEach((item) => {
      state[item.id] = item.checked;
    });
    localStorage.setItem("review-checklist-state", JSON.stringify(state));
    console.log("Saved to localStorage:", state);
  }, [items, mounted]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, checked: true })));
  };

  const deselectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const allSelected = totalCount > 0 && checkedCount === totalCount;
  const allDeselected = checkedCount === 0;

  // Render the content with checkboxes
  const renderContent = () => {
    if (!content) return [];

    const lines = content.split("\n");
    let itemIndex = 0;
    const result: JSX.Element[] = [];
    let currentKey = 0;

    lines.forEach((line, index) => {
      const checklistMatch = line.match(/^(\s*)- \[ \] (.+)$/);

      if (checklistMatch) {
        const item = items[itemIndex];
        if (item) {
          const spaces = checklistMatch[1].length;
          const level = Math.floor(spaces / 2);
          const paddingLeft = level * 24;

          result.push(
            <div
              key={`item-${currentKey++}`}
              className="flex items-start gap-3 py-2 hover:bg-muted/50 rounded-md px-2 transition-colors"
              style={{ paddingLeft: `${paddingLeft + 8}px` }}
            >
              <Checkbox
                id={item.id}
                checked={item.checked}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-1"
              />
              <label
                htmlFor={item.id}
                className={`flex-1 text-sm cursor-pointer select-none leading-relaxed not-prose checklist-item-label ${
                  item.checked ? "checked" : ""
                }`}
              >
                {parseInlineMarkdown(item.text)}
              </label>
            </div>
          );
          itemIndex++;
        }
      } else if (line.trim().startsWith("#")) {
        // Render headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
          const headingId = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          const className =
            level === 1
              ? "text-4xl font-bold mb-4 mt-8"
              : level === 2
              ? "text-3xl font-bold mb-4 mt-8 pt-6 border-t"
              : level === 3
              ? "text-2xl font-semibold mb-3 mt-6"
              : level === 4
              ? "text-xl font-semibold mb-2 mt-4"
              : "text-lg font-medium mb-2 mt-3";

          result.push(
            <HeadingTag
              key={`heading-${currentKey++}`}
              id={headingId}
              className={className}
              style={{ scrollMarginTop: "140px" }}
            >
              {parseInlineMarkdown(text)}
            </HeadingTag>
          );
        }
      } else if (line.trim() === "---") {
        result.push(
          <hr key={`hr-${currentKey++}`} className="my-8 border-border" />
        );
      } else if (line.trim().startsWith("```")) {
        // Handle code blocks
        const codeBlockStart = index;
        let codeBlockEnd = index;
        for (let i = index + 1; i < lines.length; i++) {
          if (lines[i].trim().startsWith("```")) {
            codeBlockEnd = i;
            break;
          }
        }
        const codeContent = lines
          .slice(codeBlockStart + 1, codeBlockEnd)
          .join("\n");
        result.push(
          <pre
            key={`code-${currentKey++}`}
            className="bg-muted p-4 rounded-md overflow-x-auto my-4"
          >
            <code className="text-sm">{codeContent}</code>
          </pre>
        );
      } else if (line.trim() !== "" && !line.startsWith("```")) {
        // Regular paragraph
        if (line.trim().startsWith("_") && line.trim().endsWith("_")) {
          // Italicized text (usually back links)
          const text = line.trim().slice(1, -1);
          result.push(
            <p
              key={`italic-${currentKey++}`}
              className="text-sm text-muted-foreground italic mt-6"
            >
              {text}
            </p>
          );
        } else if (!line.startsWith("#") && !line.startsWith("-")) {
          result.push(
            <p key={`p-${currentKey++}`} className="mb-4 leading-relaxed">
              {parseInlineMarkdown(line)}
            </p>
          );
        }
      }
    });

    return result;
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="relative">
      {/* Floating Toolbar */}
      <div className="sticky top-20 z-50 mb-12">
        <div className="checklist-toolbar backdrop-blur-md rounded-xl p-5!">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-semibold checklist-progress-text">
                  Progress: {checkedCount} / {totalCount}
                </span>
                <span className="text-base font-bold checklist-progress-percentage">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-3 w-full" />
            </div>
            <div className="flex gap-3 shrink-0">
              <Button
                onClick={selectAll}
                disabled={allSelected}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Select All
              </Button>
              <Button
                onClick={deselectAll}
                variant="secondary"
                disabled={allDeselected}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Deselect All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {renderContent()}
      </div>
    </div>
  );
}
