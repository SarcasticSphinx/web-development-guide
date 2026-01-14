import { parseMarkdown } from "@/lib/markdown";
import { CodeBlockInteractive } from "./CodeBlockInteractive";

interface ServerMarkdownContentProps {
  content: string;
}

export async function ServerMarkdownContent({
  content,
}: ServerMarkdownContentProps) {
  const { html } = await parseMarkdown(content);

  return (
    <>
      <div
        className="content server-markdown"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* Client-side script for copy functionality */}
      <CodeBlockInteractive />
    </>
  );
}
