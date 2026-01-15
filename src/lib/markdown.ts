import { createHighlighter, type Highlighter } from "shiki";
import { marked, type Tokens, type RendererObject } from "marked";

let highlighterPromise: Promise<Highlighter> | null = null;

// Singleton highlighter instance
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: [
        "typescript",
        "javascript",
        "tsx",
        "jsx",
        "json",
        "bash",
        "shell",
        "yaml",
        "markdown",
        "css",
        "html",
        "sql",
        "prisma",
        "graphql",
        "python",
        "text",
      ],
    });
  }
  return highlighterPromise;
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
    "": "text",
  };
  return langMap[lang] || lang || "text";
}

// Extract filename from code comment
function extractFilename(code: string, lang: string): string {
  const firstLine = code.split("\n")[0]?.trim() || "";
  const patterns = [/^\/\/\s*(.+\.\w+)/, /^#\s*(.+\.\w+)/, /^\/\*\s*(.+\.\w+)/];
  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match) {
      const parts = match[1].split("/");
      return parts[parts.length - 1];
    }
  }
  // Default filename based on language
  const defaultNames: Record<string, string> = {
    typescript: "code.ts",
    javascript: "code.js",
    tsx: "component.tsx",
    jsx: "component.jsx",
    json: "config.json",
    bash: "terminal",
    yaml: "config.yaml",
    css: "styles.css",
    html: "index.html",
  };
  return defaultNames[lang] || "code";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface ParsedMarkdown {
  html: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const highlighter = await getHighlighter();
  const headings: Array<{ id: string; text: string; level: number }> = [];

  const renderer: RendererObject = {
    heading({ tokens, depth }: Tokens.Heading): string {
      const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
      const id = slugify(text);
      // Skip "Table of Contents" from TOC sidebar
      if (text.toLowerCase() !== "table of contents") {
        headings.push({ id, text, level: depth });
      }
      return `<h${depth} id="${id}">${text}</h${depth}>`;
    },

    code({ text, lang }: Tokens.Code): string {
      const normalizedLang = normalizeLanguage(lang || "");
      const filename = extractFilename(text, normalizedLang);

      let highlightedCode: string;
      try {
        highlightedCode = highlighter.codeToHtml(text, {
          lang: normalizedLang,
          theme: "github-dark",
        });
      } catch {
        // Fallback for unsupported languages
        highlightedCode = highlighter.codeToHtml(text, {
          lang: "text",
          theme: "github-dark",
        });
      }

      // Wrap in our custom code block structure
      return `
        <div class="code-block-wrapper" data-code="${encodeURIComponent(text)}">
          <div class="code-block-header">
            <span class="code-block-filename">${filename}</span>
            <button class="code-block-copy" aria-label="Copy code">
              <svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span class="copy-text">Copy</span>
            </button>
          </div>
          <div class="code-block-content">
            ${highlightedCode}
          </div>
        </div>
      `;
    },

    link({ href, tokens }: Tokens.Link): string {
      const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
      if (href.startsWith("#")) {
        return `<a href="${href}" class="anchor-link">${text}</a>`;
      }
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  };

  marked.use({ renderer });

  const html = await marked.parse(content, {
    gfm: true,
    breaks: false,
    async: true,
  });

  return { html, headings };
}
