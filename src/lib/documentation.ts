import { marked } from "marked";

import { documentationSources } from "@/generated/documentation";

export type DocumentationEntry = {
  slug: string;
  title: string;
  description: string;
  file: string;
  accent: string;
};

export const documentationEntries: DocumentationEntry[] = [
  { slug: "overview", title: "Project overview", description: "Setup, architecture, development, and deployment.", file: "README.md", accent: "indigo" },
  { slug: "plugins", title: "Plugin development", description: "Private repositories, runtime permissions, and native plugin views.", file: "docs/PLUGINS.md", accent: "violet" },
  { slug: "api", title: "Public API", description: "Authentication, endpoints, request formats, and conventions.", file: "docs/API.md", accent: "sky" },
  { slug: "database", title: "Database", description: "Core data model and persistence conventions.", file: "docs/DATABASE.md", accent: "emerald" },
  { slug: "audit", title: "Engineering audit", description: "Security, performance, and maintainability decisions.", file: "docs/AUDIT.md", accent: "amber" },
  { slug: "contributing", title: "Contributing", description: "How to prepare and validate repository changes.", file: "CONTRIBUTING.md", accent: "rose" },
];

export function documentationEntry(slug: string): DocumentationEntry | undefined {
  return documentationEntries.find((entry) => entry.slug === slug);
}

export function renderDocumentation(entry: DocumentationEntry): string {
  const source = documentationSources[entry.slug];
  if (source === undefined) throw new Error(`Missing generated documentation for ${entry.slug}.`);
  return marked.parse(source, { async: false, gfm: true }) as string;
}
