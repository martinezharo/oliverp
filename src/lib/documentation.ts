import { marked } from "marked";

import { documentationSources } from "@/generated/documentation";
import type { Lang } from "@/i18n/locale";

/**
 * A document, and how the application introduces it.
 *
 * The title and the description are keys rather than sentences, because the
 * shelf they sit on is part of the interface and gets translated with the rest
 * of it. The documents are generated from the selected Markdown files at build
 * time, one source per language. Repository-only material is kept out of this
 * list even though it may still be useful to contributors.
 */
export type DocumentationEntry = {
  slug: string;
  titleKey: string;
  descriptionKey: string;
  file: string;
  accent: string;
};

export const documentationEntries: DocumentationEntry[] = [
  { slug: "guide", titleKey: "docs.entry.guide.title", descriptionKey: "docs.entry.guide.description", file: "docs/APP_GUIDE.md", accent: "indigo" },
  { slug: "plugins", titleKey: "docs.entry.plugins.title", descriptionKey: "docs.entry.plugins.description", file: "docs/PLUGINS.md", accent: "violet" },
  { slug: "api", titleKey: "docs.entry.api.title", descriptionKey: "docs.entry.api.description", file: "docs/API.md", accent: "sky" },
];

export function documentationEntry(slug: string): DocumentationEntry | undefined {
  return documentationEntries.find((entry) => entry.slug === slug);
}

export function renderDocumentation(entry: DocumentationEntry, lang: Lang): string {
  const source = documentationSources[lang]?.[entry.slug];
  if (source === undefined) throw new Error(`Missing generated documentation for ${entry.slug}.`);
  return marked.parse(source, { async: false, gfm: true }) as string;
}
