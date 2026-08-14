import { LOCALE_TAGS, localeHref, type Lang } from "@/i18n/locale";
import type { Translate } from "@/i18n/t";
import { siteUrl } from "@/lib/site";

import { GITHUB_HREF } from "./content";

/**
 * What the landing page is, in the vocabulary search engines read.
 *
 * Only claims the repository can back: it is a free, open-source web
 * application, its licence is MIT, its source is on GitHub, and it exists in
 * two languages. No invented ratings, no invented author, no `aggregateRating`
 * — those are the parts of this vocabulary that get sites penalised, and none
 * of them would be true.
 *
 * Emitted as a script tag rather than through `metadata`, which has no field
 * for it. The JSON is built here and serialized once; it contains no
 * user input, so there is nothing in it that could close the tag early.
 */
export function StructuredData({ lang, t }: { lang: Lang; t: Translate }) {
  const url = siteUrl(localeHref(lang, "/"));

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t("pwa.shortName"),
    description: t("landing.meta.description"),
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    inLanguage: LOCALE_TAGS[lang],
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    codeRepository: GITHUB_HREF,
    screenshot: siteUrl("/dashboard_preview.png"),
    // Free, and saying so in the vocabulary that means it.
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
