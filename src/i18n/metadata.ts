import type { Metadata } from "next";

import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, localeHref, type Lang } from "./locale";

/**
 * The canonical address of a page and every language it exists in.
 *
 * Search engines need both halves and they have to agree: each language names
 * itself as canonical, and all of them list all of the others — a page that
 * points at an alternate which does not point back is ignored. `x-default`
 * goes to the unprefixed English page, which is where a visitor whose language
 * OlivERP does not speak is best served.
 *
 * `path` is the unprefixed path, the same one `lib/navigation.ts` builds. The
 * URLs come out relative and Next makes them absolute against the
 * `metadataBase` set in the root layout.
 */
export function localeAlternates(lang: Lang, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localeHref(lang, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((locale) => [LOCALE_TAGS[locale], localeHref(locale, path)])),
      "x-default": localeHref(DEFAULT_LOCALE, path),
    },
  };
}
