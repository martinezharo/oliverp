import type { MetadataRoute } from "next";

import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, localeHref } from "@/i18n/locale";
import { siteUrl } from "@/lib/site";

/**
 * Every page a search engine should know about — which, for an ERP, is a short
 * list. The application is behind a session and declined in `robots.ts`; what
 * is left is the landing page, once per language.
 *
 * Each entry carries the other languages as `alternates`, the sitemap's own
 * form of `hreflang`, so the two versions are understood as one page in two
 * languages rather than as duplicates competing with each other.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/"];

  return pages.flatMap((path) =>
    LOCALES.map((lang) => ({
      url: siteUrl(localeHref(lang, path)),
      changeFrequency: "monthly" as const,
      // The unprefixed page is the one to prefer when a crawler has no reason
      // to choose; the other language is an equal alternative, not a lesser one.
      priority: lang === DEFAULT_LOCALE ? 1 : 0.9,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((alternate) => [LOCALE_TAGS[alternate], siteUrl(localeHref(alternate, path))]),
        ),
      },
    })),
  );
}
