import { marked } from "marked";

import { documentationSources } from "@/generated/documentation";

/**
 * A document, and how the application introduces it.
 *
 * The title and the description are keys rather than sentences, because the
 * shelf they sit on is part of the interface and gets translated with the rest
 * of it. The documents themselves do not: they are the repository's own
 * Markdown, versioned with the code they describe, and keeping a second
 * translated copy of them in step would be a promise this project cannot make.
 * So the covers are Spanish and the pages are English — which is at least
 * honest about which is which.
 */
export type DocumentationEntry = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  file: string;
  accent: string;
};

export const documentationEntries: DocumentationEntry[] = [
  { slug: "overview", titleKey: "docs.entry.overview.title", descriptionKey: "docs.entry.overview.description", file: "README.md", accent: "indigo" },
  { slug: "plugins", titleKey: "docs.entry.plugins.title", descriptionKey: "docs.entry.plugins.description", file: "docs/PLUGINS.md", accent: "violet" },
  { slug: "api", titleKey: "docs.entry.api.title", descriptionKey: "docs.entry.api.description", file: "docs/API.md", accent: "sky" },
  { slug: "database", titleKey: "docs.entry.database.title", descriptionKey: "docs.entry.database.description", file: "docs/DATABASE.md", accent: "emerald" },
  { slug: "audit", titleKey: "docs.entry.audit.title", descriptionKey: "docs.entry.audit.description", file: "docs/AUDIT.md", accent: "amber" },
  { slug: "contributing", titleKey: "docs.entry.contributing.title", descriptionKey: "docs.entry.contributing.description", file: "CONTRIBUTING.md", accent: "rose" },
];

export function documentationEntry(slug: string): DocumentationEntry | undefined {
  return documentationEntries.find((entry) => entry.slug === slug);
}

export function renderDocumentation(entry: DocumentationEntry): string {
  const source = documentationSources[entry.slug];
  if (source === undefined) throw new Error(`Missing generated documentation for ${entry.slug}.`);
  return marked.parse(source, { async: false, gfm: true }) as string;
}
