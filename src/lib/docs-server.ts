import fs from "fs";
import path from "path";
import { DOCS } from "./docs";

export function getDocContent(slug: string): string | null {
  const doc = DOCS.find((d) => d.id === slug);
  if (!doc) return null;

  try {
    const filePath = path.join(process.cwd(), "public/content", `${slug}.md`);
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    console.error(`Error reading file for slug ${slug}:`, error);
    return null;
  }
}

export function getAllDocSlugs() {
  return DOCS.map((doc) => ({
    slug: doc.id,
  }));
}
