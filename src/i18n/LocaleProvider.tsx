"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext } from "react";

import { DEFAULT_LOCALE, localeHref, splitLocale, type Lang } from "./locale";
import { getTranslator, type Translator } from "./t";

/**
 * The language of the page, handed down from the layout that read it out of
 * the URL.
 *
 * Context rather than a module-level variable because the same components are
 * rendered on the server, where two requests in two languages are in flight at
 * once and anything module-level is shared between them.
 */
const LocaleContext = createContext<Translator>(getTranslator(DEFAULT_LOCALE));

export function LocaleProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LocaleContext.Provider value={getTranslator(lang)}>{children}</LocaleContext.Provider>;
}

/**
 * The page's translator: `const { t } = useT()`, or `const { t, plural }`.
 *
 * Also carries `lang`, which components building a link need in order to keep
 * the reader in the language they are already reading.
 */
export function useT(): Translator {
  return useContext(LocaleContext);
}

/** Just the language, for components that only need it to build a link. */
export function useLang(): Lang {
  return useContext(LocaleContext).lang;
}

/**
 * Turns one of `lib/navigation.ts`'s paths into a link that keeps the reader
 * in the language they are already reading: `href("/app/stock")` is
 * `/app/stock` in English and `/es/app/stock` in Spanish.
 *
 * Every `Link` and every programmatic navigation in the application goes
 * through this, so following one cannot silently switch the page back to
 * English.
 */
export function useHref(): (path: string) => string {
  const lang = useLang();
  return useCallback((path: string) => localeHref(lang, path), [lang]);
}

/**
 * The current path with the language stripped off, which is what the route
 * table is written in. `usePathname()` gives `/es/app/stock`; this gives
 * `/app/stock`, so "which section am I in" has one answer in both languages.
 */
export function useAppPathname(): string {
  const pathname = usePathname();
  return splitLocale(pathname ?? "/").path;
}
