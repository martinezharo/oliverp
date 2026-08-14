"use client";

import { useRouter } from "next/navigation";

import { rememberLocale } from "@/i18n/cookie";
import { useAppPathname, useLang, useT } from "@/i18n/LocaleProvider";
import { LOCALES, localeHref, type Lang } from "@/i18n/locale";

/**
 * Switches the page between the languages OlivERP is written in.
 *
 * It navigates to the same page's other address rather than re-rendering in
 * place: the language is in the URL, so a reader who switches can bookmark or
 * share what they are looking at and the recipient gets the same thing. The
 * choice is also written to a cookie, which is what stops the middleware from
 * negotiating them straight back to where they came from on the next visit.
 *
 * Rendered as a pair of links, so it works before hydration and a middle click
 * opens the other language in a tab, the way any other link does.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t } = useT();
  const current = useLang();
  const path = useAppPathname();
  const router = useRouter();

  function choose(lang: Lang) {
    rememberLocale(lang);
    router.push(localeHref(lang, path));
    // The chrome above this is rendered by a server component in the old
    // language, so the route has to be re-fetched rather than restored from
    // the client router's cache.
    router.refresh();
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label={t("language.label")}
    >
      {LOCALES.map((lang) => {
        const active = lang === current;
        return (
          <a
            key={lang}
            href={localeHref(lang, path)}
            hrefLang={lang}
            aria-current={active ? "true" : undefined}
            onClick={(event) => {
              // Let the browser handle the modified clicks that mean "open
              // this somewhere else"; only take over the plain one.
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              choose(lang);
            }}
            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              active ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
            }`}
          >
            {t(`language.${lang}.short`)}
          </a>
        );
      })}
    </div>
  );
}
