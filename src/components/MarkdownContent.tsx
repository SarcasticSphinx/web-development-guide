"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { marked, Tokens } from "marked";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { slugify } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  docId?: string;
}

// Map common language aliases
function normalizeLanguage(lang: string): string {
  const langMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    md: "markdown",
  };
  return langMap[lang] || lang || "text";
}

// Extract filename from code comment
function extractFilename(code: string): string {
  const firstLine = code.split("\n")[0]?.trim() || "";
  const patterns = [/^\/\/\s*(.+\.\w+)/, /^#\s*(.+\.\w+)/, /^\/\*\s*(.+\.\w+)/];
  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match) {
      const parts = match[1].split("/");
      return parts[parts.length - 1];
    }
  }
  return "code";
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Code block component with syntax highlighting
function CodeBlockComponent({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);
  const normalizedLang = normalizeLanguage(language);
  const filename = extractFilename(code);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "0.5rem",
        backgroundColor: "#1e1e1e",
        fontFamily:
          "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "0.875rem",
        overflow: "hidden",
        border: "1px solid #333",
        marginBottom: "1rem",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          backgroundColor: "#252525",
          borderBottom: "1px solid #333",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#888" }}>{filename}</div>
        <button
          onClick={copyToClipboard}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.75rem",
            color: copied ? "#4ade80" : "#888",
            transition: "color 0.2s",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      {/* Code content with syntax highlighting */}
      <div style={{ padding: "1rem", overflow: "auto" }}>
        <SyntaxHighlighter
          language={normalizedLang}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "0.875rem",
            fontFamily:
              "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: "2.5em",
            paddingRight: "1em",
            color: "#555",
            textAlign: "right",
            userSelect: "none",
            background: "transparent",
            border: "none",
          }}
          codeTagProps={{
            style: {
              background: "transparent",
              color: "#e0e0e0",
              fontFamily:
                "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
          }}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function MarkdownContent({
  content,
  docId = "doc",
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [codeBlocks, setCodeBlocks] = useState<
    Array<{ code: string; language: string; id: string }>
  >([]);

  // Parse markdown and extract code blocks
  const { html, extractedBlocks } = useMemo(() => {
    const blocks: Array<{ code: string; language: string; id: string }> = [];
    let blockIndex = 0;

    // Custom renderer
    const renderer = {
      heading({ tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const id = slugify(text);
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },

      code({ text, lang }: Tokens.Code) {
        const id = `code-block-${blockIndex++}`;
        blocks.push({ code: text, language: lang || "text", id });
        return `<div data-code-block-id="${id}" class="code-block-placeholder"></div>`;
      },

      link({ href, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        if (href.startsWith("#")) {
          return `<a href="${href}" class="anchor-link">${text}</a>`;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      },

      listitem({ tokens, task, checked }: Tokens.ListItem) {
        const text = this.parser.parseInline(tokens);
        if (task) {
          const id = hashString(text + docId);
          const checkedAttr = checked ? "checked" : "";
          return `
            <li class="task-list-item" style="list-style: none; margin-bottom: 0.5rem;">
              <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; user-select: none;">
                <input 
                  type="checkbox" 
                  data-checklist-id="${id}" 
                  ${checkedAttr} 
                  class="checklist-checkbox"
                  style="margin-top: 0.25rem; cursor: pointer;"
                />
                <span class="checklist-text" style="line-height: 1.5; color: var(--color-text);">${text}</span>
              </label>
            </li>
          `;
        }
        return `<li>${text}</li>`;
      },
    };

    marked.use({ renderer });

    const parsedHtml = marked.parse(content, {
      gfm: true,
      breaks: false,
    }) as string;

    return { html: parsedHtml, extractedBlocks: blocks };
  }, [content, docId]);

  // Update code blocks state
  useEffect(() => {
    setCodeBlocks(extractedBlocks);
  }, [extractedBlocks]);

  // Add IDs to headings for anchor links
  useEffect(() => {
    if (!containerRef.current) return;

    const headings = containerRef.current.querySelectorAll("h2, h3");
    headings.forEach((heading) => {
      if (!heading.id) {
        heading.id = slugify(heading.textContent || "");
      }
    });
  }, [html]);

  // Create the rendered content with code blocks replaced
  const renderedContent = useMemo(() => {
    if (!html) return null;

    // Split HTML by code block placeholders
    const parts = html.split(
      /(<div data-code-block-id="[^"]+" class="code-block-placeholder"><\/div>)/
    );

    return parts.map((part, index) => {
      const match = part.match(/data-code-block-id="([^"]+)"/);
      if (match) {
        const blockId = match[1];
        const block = codeBlocks.find((b) => b.id === blockId);
        if (block) {
          return (
            <CodeBlockComponent
              key={blockId}
              code={block.code}
              language={block.language}
            />
          );
        }
      }
      // Regular HTML content
      return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  }, [html, codeBlocks]);

  // Handle anchor link clicks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor) {
        const href = anchor.getAttribute("href");

        // Handle anchor links (e.g., #section-name)
        if (href?.startsWith("#")) {
          e.preventDefault();
          const elementId = href.slice(1);
          const element = document.getElementById(elementId);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="content">
      {renderedContent}
    </div>
  );
}
