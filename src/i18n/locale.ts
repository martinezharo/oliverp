/**
 * Which languages exist, and how one is read out of a URL.
 *
 * Everything here is a pure function over strings so the middleware, the
 * server components, the client components and the sitemap can all agree on
 * what `/es/app/stock` means without any of them importing the others.
 *
 * The default language is not written into the URL: `/app/stock` is English
 * and `/es/app/stock` is Spanish. One canonical address per page, and the
 * addresses that already exist keep working.
 */

export const LOCALES = ["en", "es"] as const;

export type Lang = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Lang = "en";

/** BCP 47 tags for `hreflang`, `<html lang>` and the sitemap. */
export const LOCALE_TAGS: Record<Lang, string> = { en: "en", es: "es" };

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/**
 * Splits a request path into the language it names and the path underneath it.
 *
 * `/es/app/stock` → `{ lang: "es", path: "/app/stock" }`
 * `/app/stock`    → `{ lang: "en", path: "/app/stock" }`
 * `/es`           → `{ lang: "es", path: "/" }`
 *
 * `path` is what the rest of the application reasons about — the route policy,
 * the sidebar's idea of the current section — none of which should have to
 * know that a language can be sitting in front of it.
 */
export function splitLocale(pathname: string): { lang: Lang; path: string } {
  const [, first = "", ...rest] = pathname.split("/");
  if (!isLang(first) || first === DEFAULT_LOCALE) return { lang: DEFAULT_LOCALE, path: pathname };
  return { lang: first, path: `/${rest.join("/")}` };
}

/**
 * The address of `path` in `lang`. `path` must be the unprefixed one, which is
 * what `splitLocale` returns and what `lib/navigation.ts` builds.
 */
export function localeHref(lang: Lang, path: string): string {
  if (lang === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/**
 * The best language for an `Accept-Language` header.
 *
 * Quality values are honoured, and a regional tag matches its language, so
 * `es-419` and `es-ES` both count as Spanish. An unparseable or absent header
 * gets the default rather than an error — this decides a redirect, not
 * anything that can be got wrong in a way worth failing over.
 */
export function negotiateLocale(header: string | null | undefined): Lang {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((entry) => {
      const [tag = "", ...parameters] = entry.trim().split(";");
      const quality = parameters
        .map((parameter) => /^\s*q=([\d.]+)\s*$/.exec(parameter))
        .find(Boolean);
      return { tag: tag.trim().toLowerCase(), quality: quality ? Number(quality[1]) : 1 };
    })
    .filter((entry) => entry.tag !== "" && Number.isFinite(entry.quality) && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === "*") return DEFAULT_LOCALE;
    const base = tag.split("-")[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LOCALE;
}
