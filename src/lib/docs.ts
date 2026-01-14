export interface Doc {
  id: string;
  title: string;
  section: string;
}

export const DOCS: Doc[] = [
  { id: "01-introduction", title: "Introduction", section: "Getting Started" },
  {
    id: "02-typescript-fundamentals",
    title: "TypeScript Fundamentals",
    section: "Core Standards",
  },
  {
    id: "03-nextjs-patterns",
    title: "Next.js Patterns",
    section: "Core Standards",
  },
  {
    id: "04-error-handling",
    title: "Error Handling",
    section: "Core Standards",
  },
  { id: "05-code-style", title: "Code Style", section: "Core Standards" },
  { id: "06-performance", title: "Performance", section: "Core Standards" },
  { id: "07-testing", title: "Testing", section: "Quality Assurance" },
  { id: "08-security", title: "Security", section: "Quality Assurance" },
  {
    id: "09-accessibility",
    title: "Accessibility",
    section: "Quality Assurance",
  },
  {
    id: "10-documentation",
    title: "Documentation",
    section: "Quality Assurance",
  },
  {
    id: "11-project-structure",
    title: "Project Structure",
    section: "Architecture",
  },
  {
    id: "12-state-management",
    title: "State Management",
    section: "Architecture",
  },
  { id: "13-api-design", title: "API Design", section: "Architecture" },
  { id: "14-components", title: "Components", section: "Architecture" },
  {
    id: "15-forms-validation",
    title: "Forms & Validation",
    section: "Implementation",
  },
  { id: "16-environment", title: "Environment", section: "Implementation" },
  { id: "17-deployment", title: "Deployment", section: "Implementation" },
  {
    id: "18-review-checklist",
    title: "Review Checklist",
    section: "Reference",
  },
];

export const SECTIONS = [
  {
    name: "Getting Started",
    docs: DOCS.filter((d) => d.section === "Getting Started"),
  },
  {
    name: "Core Standards",
    docs: DOCS.filter((d) => d.section === "Core Standards"),
  },
  {
    name: "Quality Assurance",
    docs: DOCS.filter((d) => d.section === "Quality Assurance"),
  },
  {
    name: "Architecture",
    docs: DOCS.filter((d) => d.section === "Architecture"),
  },
  {
    name: "Implementation",
    docs: DOCS.filter((d) => d.section === "Implementation"),
  },
  { name: "Reference", docs: DOCS.filter((d) => d.section === "Reference") },
];
